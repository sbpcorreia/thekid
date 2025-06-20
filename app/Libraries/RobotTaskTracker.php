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
    const ROTATION_THRESHOLD = 5;   // graus mínimos para considerar rotação
    const MIN_DISTANCE = 10;        // mm mínimos para considerar movimento
    const SMOOTHING_FACTOR = 0.3;   // Fator de suavização para estimativas
    const PROGRESS_THRESHOLD = 0.1; // Threshold mínimo para considerar progresso
    
    // Status do robô que permitem tracking
    const TRACKABLE_STATUSES = ["1", "2", "6", "81", "83", "86", "4"]; // 1=parado, 2=executando, 6=subindo carrinho, 81=obstrução
    const COMPLETED_STATUSES = ["3"]; // 4=tarefa concluída
    
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
            
            $elapsedTime = $now - $startTime;
            
            // Calcular progresso baseado na diminuição de pontos do path
            $pathProgress = $this->calculatePathProgress($initialPathCount, count($path));
            
            // Calcular progresso baseado na distância percorrida
            $distanceProgress = $this->calculateDistanceProgress($path, $currentX, $currentY, $totalDistanceInitial);
            
            // Combinar os dois métodos de progresso com pesos adaptativos
            $combinedProgress = $this->combineProgressMethods($pathProgress, $distanceProgress, $elapsedTime);
            
            // Suavizar progresso para evitar oscilações
            $smoothedProgress = $this->smoothProgress($lastProgress, $combinedProgress);
            
            // Calcular tempo restante baseado no progresso suavizado
            $remainingTime = $this->calculateRemainingTime($initialTotalTime, $smoothedProgress, $elapsedTime);
            
            // Suavizar estimativa de tempo
            $smoothedEstimate = $this->smoothEstimate($lastEstimate, $remainingTime, $elapsedTime);
            
            // Detectar se está progredindo (considerar status para determinar se deve estar parado)
            $isProgressing = $this->isRobotProgressing($lastPosition, $currentX, $currentY, $smoothedProgress, $lastProgress, $status);
            
            // Atualizar cache
            $this->updateCache($keyPrefix, $now, $currentX, $currentY, $smoothedProgress, $smoothedEstimate);
            
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
                'averageSpeed' => $this->calculateCurrentSpeed($lastPosition, $currentX, $currentY, $lastUpdate, $now),
                'currentStatus' => $status
            );
        }
        
        // Limpar cache se não está em status trackable ou não tem path
        $this->clearTaskCache($robotId);
        return array();
    }
    
    
    /**
     * Verificar se o robô está progredindo (modificado para considerar status)
     */
    protected function isRobotProgressing(array $lastPosition, float $currentX, float $currentY, float $currentProgress, float $lastProgress, string $status): bool
    {
        // Se está em obstrução ou pausado, não deveria estar progredindo fisicamente mas pode manter progresso
        if (in_array($status, ["1", "81"])) {
            // Verificar apenas progresso percentual, não movimento físico
            return $currentProgress >= $lastProgress;
        }
        
        // Para status 2 (executando) e 6 (subindo carrinho), verificar tanto progresso quanto movimento
        if ($currentProgress > $lastProgress + self::PROGRESS_THRESHOLD) {
            return true;
        }
        
        // Verificar movimento físico
        if (is_array($lastPosition) && count($lastPosition) >= 2) {
            $distance = $this->calculateDistance($lastPosition, [$currentX, $currentY]);
            return $distance > 50; // Movimento mínimo de 5cm
        }
        
        return true;
    }

    // ... resto dos métodos permanecem iguais ...
    
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
        
        if ($remainingDistance <= 0) return 100;
        
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
        if ($nearestIndex >= 0) {
            $totalRemaining += $this->calculateDistance($currentPos, $pathPoints[$nearestIndex]);
            
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
        // No início, dar mais peso ao progresso por pontos
        // Com o tempo, dar mais peso ao progresso por distância
        $timeWeight = min(1.0, $elapsedTime / 60); // Transição ao longo de 1 minuto
        
        $pathWeight = 1.0 - $timeWeight;
        $distanceWeight = $timeWeight;
        
        // Se a diferença entre os métodos for muito grande, favorecer o maior
        $diff = abs($pathProgress - $distanceProgress);
        if ($diff > 20) {
            $higherProgress = max($pathProgress, $distanceProgress);
            $lowerProgress = min($pathProgress, $distanceProgress);
            
            // Se um método indica muito mais progresso, pode estar correto
            return ($higherProgress * 0.7) + ($lowerProgress * 0.3);
        }
        
        return ($pathProgress * $pathWeight) + ($distanceProgress * $distanceWeight);
    }
    
    /**
     * Suavizar progresso para evitar oscilações
     */
    protected function smoothProgress(float $lastProgress, float $newProgress): float
    {
        // Não permitir retrocessos significativos no progresso
        if ($newProgress < $lastProgress - 5) {
            return $lastProgress; // Manter progresso anterior se há retrocesso significativo
        }
        
        // Suavizar usando média exponencial
        return ($lastProgress * (1 - self::SMOOTHING_FACTOR)) + ($newProgress * self::SMOOTHING_FACTOR);
    }
    
    /**
     * Calcular tempo restante baseado no progresso
     */
    protected function calculateRemainingTime(float $initialTime, float $progressPercent, int $elapsedTime): float
    {
        if ($progressPercent >= 99.9) return 0;
        if ($progressPercent <= 0.1) return $initialTime;
        
        // Método 1: Baseado no progresso linear
        $remainingPercent = 100 - $progressPercent;
        $linearEstimate = ($remainingPercent / 100) * $initialTime;
        
        // Método 2: Baseado na taxa de progresso observada
        if ($elapsedTime > 10 && $progressPercent > 5) {
            $progressRate = $progressPercent / $elapsedTime; // % por segundo
            if ($progressRate > 0) {
                $rateBasedEstimate = $remainingPercent / $progressRate;
                
                // Combinar os dois métodos
                $timeWeight = min(0.7, $elapsedTime / 120); // Dar mais peso à taxa observada com o tempo
                return ($rateBasedEstimate * $timeWeight) + ($linearEstimate * (1 - $timeWeight));
            }
        }
        
        return $linearEstimate;
    }
    
    /**
     * Suavizar estimativa de tempo
     */
    protected function smoothEstimate(float $lastEstimate, float $newEstimate, int $elapsedTime): float
    {
        // Para tarefas recentes, permitir mais variação
        if ($elapsedTime < 30) {
            return $newEstimate;
        }
        
        // Suavizar mais agressivamente para evitar oscilações
        $smoothingFactor = 0.2; // Menor = mais suave
        return ($lastEstimate * (1 - $smoothingFactor)) + ($newEstimate * $smoothingFactor);
    }
    
    /**
     * Calcular velocidade atual
     */
    protected function calculateCurrentSpeed(array $lastPosition, float $currentX, float $currentY, int $lastUpdate, int $now): float
    {
        if (!is_array($lastPosition) || count($lastPosition) < 2 || $now <= $lastUpdate) {
            return round(self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR);
        }
        
        $distance = $this->calculateDistance($lastPosition, [$currentX, $currentY]);
        $timeSpent = $now - $lastUpdate;
        
        if ($timeSpent <= 0) return round(self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR);
        
        $speed = $distance / $timeSpent;
        
        // Limitar velocidades irreais
        if ($speed > self::MAX_LINEAR_SPEED * 1.2 || $speed < 50) {
            return round(self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR);
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
        
        if ($elapsedTime < 30) {
            return 'initial_calculation';
        } elseif ($diff > 20) {
            return 'hybrid_with_correction';
        } elseif ($elapsedTime < 120) {
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
    protected function updateCache($keyPrefix, $now, $currentX, $currentY, $progress, $estimate)
    {
        $this->cache->save("{$keyPrefix}_last_update", $now, 1800);
        $this->cache->save("{$keyPrefix}_last_position", [$currentX, $currentY], 1800);
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
            'last_progress', 'last_estimate'
        ];
        
        foreach ($keys as $key) {
            $this->cache->delete("{$prefix}_{$key}");
        }
    }
}