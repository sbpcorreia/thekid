<?php

namespace App\Libraries;

use Config\Services;

class RobotTaskTracker
{
    protected $cache;

    // Constantes de configuração do robô
    const MAX_LINEAR_SPEED = 1200;  // mm/s - velocidade máxima
    const AVERAGE_SPEED_FACTOR = 0.7; // 70% da velocidade máxima como média
    const ROTATION_SPEED = 90;      // graus/s - velocidade rotação
    const ROTATION_THRESHOLD = 3;   // graus mínimos para considerar rotação (reduzido para mais sensibilidade)
    const MIN_DISTANCE = 5;         // mm mínimos para considerar movimento (reduzido para mais sensibilidade)
    const SMOOTHING_FACTOR = 0.15;  // Fator de suavização para progresso (reduzido para mais responsividade)
    const ESTIMATE_SMOOTHING_FACTOR = 0.08; // Novo fator para suavização de estimativas (ainda mais suave e responsivo)
    const PROGRESS_THRESHOLD = 0.5; // Threshold mínimo para considerar progresso (aumentado para evitar flutuações, mas o isProgressing é mais crítico)
    const MIN_MOVEMENT_FOR_PROGRESS = 50; // mm - Movimento mínimo para considerar progresso físico (5cm)

    // Status do robô que permitem tracking
    const TRACKABLE_STATUSES = ["1", "2", "6", "81", "83", "86", "4"]; // 1=parado, 2=executando, 6=subindo carrinho, 81=obstrução
    const COMPLETED_STATUSES = ["3"]; // 3=tarefa concluída

    public function __construct()
    {
        $this->cache = Services::cache();
    }

    public function processRobotData(object $robot)
    {
        $robotId = $robot->robotCode;
        $status = $robot->status;
        $path = $robot->path;
        $currentX = floatval($robot->posX);
        $currentY = floatval($robot->posY);
        $currentDir = floatval($robot->robotDir);

        // Verificar se é um status que deve ser limpo (tarefa concluída)
        if (in_array($status, self::COMPLETED_STATUSES)) {
            $this->clearTaskCache($robotId);
            return array();
        }

        // Processar apenas status que permitem tracking e que tenham path
        if (in_array($status, self::TRACKABLE_STATUSES) && count($path) > 0) {
            $keyPrefix = "robot_task_{$robotId}";
            $now = time();

            // Primeira vez - inicializar
            if (!$this->cache->get("{$keyPrefix}_start_time")) {
                return $this->initializeTask($keyPrefix, $path, $currentX, $currentY, $currentDir, $robot, $now);
            }

            // Recuperar dados do cache
            $startTime = $this->cache->get("{$keyPrefix}_start_time");
            $initialTotalTime = $this->cache->get("{$keyPrefix}_initial_total_time");
            $initialPathCount = $this->cache->get("{$keyPrefix}_initial_path_count");
            $lastUpdate = $this->cache->get("{$keyPrefix}_last_update");
            $lastPosition = $this->cache->get("{$keyPrefix}_last_position");
            $totalDistanceInitial = $this->cache->get("{$keyPrefix}_total_distance_initial");
            $lastProgress = $this->cache->get("{$keyPrefix}_last_progress") ?: 0;
            $lastEstimate = $this->cache->get("{$keyPrefix}_last_estimate") ?: $initialTotalTime;
            $lastDirection = $this->cache->get("{$keyPrefix}_last_direction") ?: $currentDir; // Adicionado para rastrear a última direção

            $elapsedTime = $now - $startTime;

            // Calcular progresso baseado na diminuição de pontos do path
            $pathProgress = $this->calculatePathProgress($initialPathCount, count($path));

            // Calcular progresso baseado na distância percorrida
            $distanceProgress = $this->calculateDistanceProgress($path, $currentX, $currentY, $totalDistanceInitial);

            // Combinar os dois métodos de progresso com pesos adaptativos
            $combinedProgress = $this->combineProgressMethods($pathProgress, $distanceProgress, $elapsedTime);

            // Suavizar progresso para evitar oscilações
            $smoothedProgress = $this->smoothProgress($lastProgress, $combinedProgress);

            // Calcular velocidade atual observada
            $currentAverageSpeed = $this->calculateCurrentSpeed($lastPosition, $currentX, $currentY, $lastUpdate, $now);

            // Calcular tempo restante baseado no progresso suavizado e velocidade atual
            $remainingTime = $this->calculateRemainingTime($initialTotalTime, $smoothedProgress, $elapsedTime, $currentAverageSpeed);

            // Suavizar estimativa de tempo
            $smoothedEstimate = $this->smoothEstimate($lastEstimate, $remainingTime, $elapsedTime);

            // Detectar se está progredindo (considerar status para determinar se deve estar parado)
            $isProgressing = $this->isRobotProgressing($lastPosition, $currentX, $currentY, $lastDirection, $currentDir, $smoothedProgress, $lastProgress, $status, $path);

            // Atualizar cache
            $this->updateCache($keyPrefix, $now, $currentX, $currentY, $currentDir, $smoothedProgress, $smoothedEstimate);

            return array(
                'robotCode' => $robotId,
                'robotName' => $robot->robotName,
                'progressPercent' => round(max(0, min(100, $smoothedProgress)), 2),
                'estimatedTimeRemaining' => round(max(0, $smoothedEstimate), 1),
                'pathPointsRemaining' => count($path),
                'totalEstimatedTime' => round($initialTotalTime, 1),
                'elapsedTime' => $elapsedTime,
                'method' => $this->getEstimationMethod($elapsedTime, $pathProgress, $distanceProgress),
                'isProgressing' => $isProgressing,
                'rotationsInPath' => $this->countRotations($path),
                'currentDirection' => $currentDir,
                'pathComplexity' => $this->analyzePathComplexity($path)['complexity'],
                'averageSpeed' => $currentAverageSpeed, // Agora representa a velocidade observada
                'currentStatus' => $status
            );
        }

        // Limpar cache se não está em status trackable ou não tem path
        $this->clearTaskCache($robotId);
        return array();
    }


    /**
     * Verificar se o robô está progredindo (modificado para considerar status e movimento/rotação)
     */
    protected function isRobotProgressing(array $lastPosition, float $currentX, float $currentY, float $lastDir, float $currentDir, float $currentProgress, float $lastProgress, string $status, array $path): bool
    {
        // Se está em obstrução (81) ou parado (1), não está progredindo fisicamente
        if (in_array($status, ["1", "81"])) {
            return false;
        }

        // Se o robô tem poucos pontos no path restantes, assume-se que está perto de concluir,
        // mas ainda pode estar fazendo ajustes finos.
        if (count($path) <= 3) { // Se há 3 ou menos pontos restantes
            // Neste ponto, se o status não é de execução (2) ou subida de carrinho (6),
            // ele pode estar em uma fase de conclusão.
            if (!in_array($status, ["2", "6", "83", "86", "4"])) { // Se não é execução ativa, mas está em status "parado" ou aguardando
                return false; // Não considerar como progredindo ativamente no caminho
            }
        }


        // Verificar progresso baseado na porcentagem (pode ser lento para reagir no final)
        if (($currentProgress - $lastProgress) > self::PROGRESS_THRESHOLD) {
            return true;
        }

        // Verificar movimento físico significativo
        if (is_array($lastPosition) && count($lastPosition) >= 2) {
            $distance = $this->calculateDistance($lastPosition, [$currentX, $currentY]);
            if ($distance > self::MIN_MOVEMENT_FOR_PROGRESS) { // Usar uma constante para movimento significativo
                return true;
            }
        }

        // Verificar rotação significativa
        $rotationAngle = abs($this->calculateRotationAngle($lastDir, $currentDir));
        if ($rotationAngle > self::ROTATION_THRESHOLD * 2) { // Rotação um pouco maior que o threshold normal
            return true;
        }

        // Para status de execução, se não houve progresso percentual, movimento ou rotação,
        // pode ser que esteja em ajustes finos ou aguardando, o que não é "progresso" no caminho.
        return false;
    }

    /**
     * Inicializar nova tarefa
     */
    protected function initializeTask($keyPrefix, $path, $currentX, $currentY, $currentDir, $robot, $now)
    {
        $totalTime = $this->calculateInitialTimeEstimate($path, $currentX, $currentY, $currentDir);
        $totalDistance = $this->calculateTotalPathDistance($path);

        $this->cache->save("{$keyPrefix}_start_time", $now, 1800);
        $this->cache->save("{$keyPrefix}_initial_total_time", $totalTime, 1800);
        $this->cache->save("{$keyPrefix}_initial_path_count", count($path), 1800);
        $this->cache->save("{$keyPrefix}_total_distance_initial", $totalDistance, 1800);
        $this->cache->save("{$keyPrefix}_last_update", $now, 1800);
        $this->cache->save("{$keyPrefix}_last_position", [$currentX, $currentY], 1800);
        $this->cache->save("{$keyPrefix}_last_direction", $currentDir, 1800); // Salva a direção inicial
        $this->cache->save("{$keyPrefix}_last_progress", 0, 1800);
        $this->cache->save("{$keyPrefix}_last_estimate", $totalTime, 1800);

        return array(
            'robotCode' => $robot->robotCode,
            'robotName' => $robot->robotName,
            'progressPercent' => 0,
            'estimatedTimeRemaining' => round($totalTime, 1),
            'pathPointsRemaining' => count($path),
            'totalEstimatedTime' => round($totalTime, 1),
            'method' => 'initial_calculation',
            'isProgressing' => true,
            'rotationsInPath' => $this->countRotations($path),
            'currentDirection' => $currentDir,
            'pathComplexity' => $this->analyzePathComplexity($path)['complexity'],
            'averageSpeed' => round(self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR),
            'currentStatus' => $robot->status
        );
    }

    /**
     * Calcular progresso baseado na diminuição de pontos do path
     */
    protected function calculatePathProgress(int $initialCount, int $currentCount): float
    {
        if ($initialCount <= 0) return 0;
        if ($currentCount <= 0) return 100; // Se não há pontos restantes, 100%

        $completedPoints = $initialCount - $currentCount;
        return ($completedPoints / $initialCount) * 100;
    }

    /**
     * Calcular progresso baseado na distância até o próximo ponto
     */
    protected function calculateDistanceProgress(array $path, float $currentX, float $currentY, float $totalDistance): float
    {
        if (empty($path) || $totalDistance <= 0) return 100;

        // Encontrar a distância restante até o final do path
        $remainingDistance = $this->calculateRemainingDistance($path, $currentX, $currentY);

        // Se a distância restante for muito pequena, considera-se 100%
        if ($remainingDistance <= self::MIN_DISTANCE) return 100;

        $completedDistance = $totalDistance - $remainingDistance;
        return ($completedDistance / $totalDistance) * 100;
    }

    /**
     * Calcular distância restante no path
     */
    protected function calculateRemainingDistance(array $path, float $currentX, float $currentY): float
    {
        if (empty($path)) return 0;

        $totalRemaining = 0;
        $currentPos = [$currentX, $currentY];

        // Converter path para array de coordenadas
        $pathPoints = [];
        foreach ($path as $pointStr) {
            $coords = explode(',', trim($pointStr, '[]'));
            if (count($coords) >= 2) {
                $pathPoints[] = [floatval($coords[0]), floatval($coords[1])];
            }
        }

        if (empty($pathPoints)) return 0;

        // Encontrar o ponto mais próximo da posição atual
        $nearestIndex = $this->findNearestPointIndex($pathPoints, $currentPos);

        // Calcular distância da posição atual até o ponto mais próximo
        // Se a distância for muito pequena até o ponto mais próximo, considerar que já passou por ele
        if ($nearestIndex >= 0) {
            $distanceToNearest = $this->calculateDistance($currentPos, $pathPoints[$nearestIndex]);
            if ($distanceToNearest > self::MIN_DISTANCE) {
                 $totalRemaining += $distanceToNearest;
            } else {
                // Se estamos muito perto do ponto, avançamos para o próximo ponto no path para calcular a restante
                $nearestIndex++;
            }

            // Somar distâncias entre os pontos restantes
            for ($i = $nearestIndex; $i < count($pathPoints) - 1; $i++) {
                $totalRemaining += $this->calculateDistance($pathPoints[$i], $pathPoints[$i + 1]);
            }
        }

        return $totalRemaining;
    }

    /**
     * Encontrar índice do ponto mais próximo
     */
    protected function findNearestPointIndex(array $pathPoints, array $currentPos): int
    {
        $nearestIndex = 0;
        $minDistance = PHP_FLOAT_MAX;

        foreach ($pathPoints as $index => $point) {
            $distance = $this->calculateDistance($currentPos, $point);
            if ($distance < $minDistance) {
                $minDistance = $distance;
                $nearestIndex = $index;
            }
        }

        return $nearestIndex;
    }

    /**
     * Calcular distância entre dois pontos
     */
    protected function calculateDistance(array $point1, array $point2): float
    {
        return sqrt(pow($point2[0] - $point1[0], 2) + pow($point2[1] - $point1[1], 2));
    }

    /**
     * Calcular distância total do path
     */
    protected function calculateTotalPathDistance(array $path): float
    {
        if (count($path) < 2) return 0;

        $totalDistance = 0;
        $lastPoint = null;

        foreach ($path as $pointStr) {
            $coords = explode(',', trim($pointStr, '[]'));
            if (count($coords) >= 2) {
                $currentPoint = [floatval($coords[0]), floatval($coords[1])];

                if ($lastPoint !== null) {
                    $totalDistance += $this->calculateDistance($lastPoint, $currentPoint);
                }

                $lastPoint = $currentPoint;
            }
        }

        return $totalDistance;
    }

    /**
     * Combinar métodos de progresso com pesos adaptativos
     */
    protected function combineProgressMethods(float $pathProgress, float $distanceProgress, int $elapsedTime): float
    {
        // No início, dar mais peso ao progresso por pontos (mais estável)
        // Com o tempo (após ~30s), dar mais peso ao progresso por distância (mais real)
        $timeWeight = min(1.0, $elapsedTime / 30); // Transição ao longo de 30 segundos

        $pathWeight = 1.0 - $timeWeight;
        $distanceWeight = $timeWeight;

        // Se a diferença entre os métodos for significativa, usar uma média ponderada
        $diff = abs($pathProgress - $distanceProgress);
        if ($diff > 10) { // Reduzido de 15 para ser mais sensível e tentar corrigir
            // Favorecer o progresso que está mais "à frente" se for a distância, ou manter um equilíbrio
            if ($distanceProgress > $pathProgress) {
                return ($pathProgress * 0.3) + ($distanceProgress * 0.7); // Dar mais peso à distância se estiver mais adiantada
            }
            return ($pathProgress * 0.7) + ($distanceProgress * 0.3); // Senão, favorecer pontos
        }

        return ($pathProgress * $pathWeight) + ($distanceProgress * $distanceWeight);
    }

    /**
     * Suavizar progresso para evitar oscilações
     */
    protected function smoothProgress(float $lastProgress, float $newProgress): float
    {
        // Apenas suavizar, sem a regra de "não permitir retrocessos significativos"
        // que pode mascarar re-planejamentos legítimos.
        return ($lastProgress * (1 - self::SMOOTHING_FACTOR)) + ($newProgress * self::SMOOTHING_FACTOR);
    }

    /**
     * Calcular tempo restante baseado no progresso
     */
    protected function calculateRemainingTime(float $initialTime, float $progressPercent, int $elapsedTime, float $currentObservedSpeed): float
    {
        if ($progressPercent >= 99.9) return 0;
        if ($progressPercent <= 0.1) return $initialTime;

        $remainingPercent = 100 - $progressPercent;

        // Método 1: Baseado no progresso linear com base no tempo inicial estimado
        $linearEstimate = ($remainingPercent / 100) * $initialTime;

        // Método 2: Baseado na taxa de progresso observada
        if ($elapsedTime > 10 && $progressPercent > 2) { // Reduzir o tempo mínimo e progresso para ativar mais cedo
            $progressRate = $progressPercent / $elapsedTime; // % por segundo
            if ($progressRate > 0) {
                $rateBasedEstimate = $remainingPercent / $progressRate;

                // Método 3: Baseado na velocidade atual observada (se razoável)
                $speedBasedEstimate = $linearEstimate; // Fallback
                $targetSpeed = self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR;

                if ($currentObservedSpeed > 0 && $targetSpeed > 0) {
                    $speedRatio = $currentObservedSpeed / $targetSpeed;
                    // Se a velocidade observada é razoável (entre 50% e 200% da média)
                    if ($speedRatio > 0.5 && $speedRatio < 2.0) {
                        $speedBasedEstimate = ($initialTime / $speedRatio) * ($remainingPercent / 100);
                    }
                }

                // Combinar os métodos
                // Dar mais peso à taxa observada e à velocidade com o tempo
                $weightForObservedData = min(0.9, $elapsedTime / 60); // Transição ao longo de 60s
                $combinedTimeEstimate = ($rateBasedEstimate * $weightForObservedData * 0.7) +
                                        ($speedBasedEstimate * $weightForObservedData * 0.3) +
                                        ($linearEstimate * (1 - $weightForObservedData));
                
                return $combinedTimeEstimate;
            }
        }

        return $linearEstimate;
    }

    /**
     * Suavizar estimativa de tempo
     */
    protected function smoothEstimate(float $lastEstimate, float $newEstimate, int $elapsedTime): float
    {
        // Para tarefas recentes, permitir mais variação (tempo de estabilização)
        if ($elapsedTime < 15) { // Reduzido de 20 para 15 segundos para ser mais responsivo
            return $newEstimate;
        }

        // Suavizar usando o novo fator de suavização
        return ($lastEstimate * (1 - self::ESTIMATE_SMOOTHING_FACTOR)) + ($newEstimate * self::ESTIMATE_SMOOTHING_FACTOR);
    }

    /**
     * Calcular velocidade atual
     */
    protected function calculateCurrentSpeed(array $lastPosition, float $currentX, float $currentY, int $lastUpdate, int $now): float
    {
        if (!is_array($lastPosition) || count($lastPosition) < 2 || $now <= $lastUpdate) {
            return round(self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR); // Fallback para velocidade média
        }

        $distance = $this->calculateDistance($lastPosition, [$currentX, $currentY]);
        $timeSpent = $now - $lastUpdate;

        if ($timeSpent <= 0) return round(self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR); // Fallback

        $speed = $distance / $timeSpent;

        // Limitar velocidades irreais: evitar saltos muito grandes ou valores muito baixos
        $avgSpeed = self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR;
        if ($speed > $avgSpeed * 2.0 || $speed < $avgSpeed * 0.1) { // Considerar speeds entre 10% e 200% da média
            return round($avgSpeed); // Retorna a velocidade média se irreal
        }

        return round($speed);
    }

    /**
     * Calcular estimativa inicial de tempo
     */
    protected function calculateInitialTimeEstimate(array $path, float $currentX, float $currentY, float $currentDir): float
    {
        if (empty($path)) return 0;

        $totalTime = 0;
        $lastX = $currentX;
        $lastY = $currentY;
        $lastDir = $currentDir;

        foreach ($path as $pointStr) {
            $coords = explode(',', trim($pointStr, '[]'));

            if (count($coords) >= 3) {
                $x = floatval($coords[0]);
                $y = floatval($coords[1]);
                $dir = floatval($coords[2]);

                // Tempo de rotação
                $rotationAngle = $this->calculateRotationAngle($lastDir, $dir);
                if (abs($rotationAngle) > self::ROTATION_THRESHOLD) {
                    $totalTime += abs($rotationAngle) / self::ROTATION_SPEED;
                }

                // Tempo de movimento
                $distance = $this->calculateDistance([$lastX, $lastY], [$x, $y]);
                if ($distance > self::MIN_DISTANCE) {
                    $speed = self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR;
                    $totalTime += $distance / $speed;
                }

                $lastX = $x;
                $lastY = $y;
                $lastDir = $dir;
            }
        }

        return $totalTime;
    }

    /**
     * Obter método de estimativa usado
     */
    protected function getEstimationMethod(int $elapsedTime, float $pathProgress, float $distanceProgress): string
    {
        $diff = abs($pathProgress - $distanceProgress);

        if ($elapsedTime < 15) { // Reduzido de 20 para 15s
            return 'initial_calculation';
        } elseif ($diff > 10) { // Reduzido de 15 para 10
            return 'hybrid_with_correction';
        } elseif ($elapsedTime < 60) { // Reduzido de 90 para 60s
            return 'path_and_distance_combined';
        } else {
            return 'progress_rate_based';
        }
    }

    /**
     * Calcular ângulo de rotação necessário entre duas direções
     */
    protected function calculateRotationAngle(float $fromDir, float $toDir): float
    {
        $angle = $toDir - $fromDir;

        // Normalizar para -180 a +180 graus
        while ($angle > 180) {
            $angle -= 360;
        }
        while ($angle < -180) {
            $angle += 360;
        }

        return $angle;
    }

    /**
     * Contar rotações significativas no path
     */
    protected function countRotations(array $path): int
    {
        if (count($path) < 2) return 0;

        $rotations = 0;
        $lastDir = null;

        foreach ($path as $pointStr) {
            $coords = explode(',', trim($pointStr, '[]'));
            if (count($coords) >= 3) {
                $dir = floatval($coords[2]);

                if ($lastDir !== null) {
                    $rotationAngle = abs($this->calculateRotationAngle($lastDir, $dir));
                    if ($rotationAngle > self::ROTATION_THRESHOLD) {
                        $rotations++;
                    }
                }
                $lastDir = $dir;
            }
        }

        return $rotations;
    }

    /**
     * Analisar complexidade do path
     */
    protected function analyzePathComplexity(array $path): array
    {
        $rotations = $this->countRotations($path);
        $totalDistance = $this->calculateTotalPathDistance($path);
        $avgDistance = count($path) > 1 ? $totalDistance / (count($path) - 1) : 0;

        $complexity = 0;
        if (count($path) > 0) {
            $complexity = min(1.0, ($rotations / count($path)) + (count($path) > 10 ? 0.2 : 0));
        }

        return [
            'rotations' => $rotations,
            'avgDistance' => $avgDistance,
            'totalDistance' => $totalDistance,
            'complexity' => $complexity
        ];
    }

    /**
     * Atualizar dados no cache
     */
    protected function updateCache($keyPrefix, $now, $currentX, $currentY, $currentDir, $progress, $estimate)
    {
        $this->cache->save("{$keyPrefix}_last_update", $now, 1800);
        $this->cache->save("{$keyPrefix}_last_position", [$currentX, $currentY], 1800);
        $this->cache->save("{$keyPrefix}_last_direction", $currentDir, 1800);
        $this->cache->save("{$keyPrefix}_last_progress", $progress, 1800);
        $this->cache->save("{$keyPrefix}_last_estimate", $estimate, 1800);
    }

    /**
     * Limpar dados do cache
     */
    protected function clearTaskCache(string $robotId)
    {
        $prefix = "robot_task_{$robotId}";
        $keys = [
            'start_time', 'initial_total_time', 'initial_path_count',
            'total_distance_initial', 'last_update', 'last_position',
            'last_direction', // Adicionado para ser limpo também
            'last_progress', 'last_estimate'
        ];

        foreach ($keys as $key) {
            $this->cache->delete("{$prefix}_{$key}");
        }
    }
}