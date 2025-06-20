<?php

//namespace App\Libraries;
//
//use Config\Services;
//
//class RobotTaskTracker
//{
//    protected $cache;
//
//    public function __construct()
//    {
//        $this->cache = Services::cache();
//    }
//
//    public function processRobotData(object $robot)
//    {
//        $robotId = $robot->robotCode;
//        $status = $robot->status;
//        $path = $robot->path; // array de [x, y, z]
//        $pathLength = count($path);
//
//        // Se o robô está em tarefa (status 2) e há path
//        if ($status == "2" && $pathLength > 0) {
//            $keyPrefix = "robot_task_{$robotId}";
//
//            // Se não há path inicial salvo, salvar agora
//            if (!$this->cache->get("{$keyPrefix}_path_total")) {
//                $this->cache->save("{$keyPrefix}_path_total", $path, 300); // 5 min
//                $this->cache->save("{$keyPrefix}_last_path_len", $pathLength, 300);
//                return array(); // Ainda não há progresso para mostrar
//            }
//
//            // Recupera valores do cache
//            $pathTotal = $this->cache->get("{$keyPrefix}_path_total");
//            $lastPathLen = $this->cache->get("{$keyPrefix}_last_path_len");
//
//            $totalPoints = count($pathTotal);
//            $progress = ($totalPoints > 0) ? round((1 - ($pathLength / $totalPoints)) * 100, 2) : 0;
//
//            // Estimar velocidade (pontos por segundo)
//            $deltaPoints = $lastPathLen - $pathLength;
//            $pointsPerSecond = ($deltaPoints > 0) ? $deltaPoints / 5 : 0;
//
//            // Estimar tempo restante
//            $estimatedTime = ($pointsPerSecond > 0) ? round($pathLength / $pointsPerSecond, 1) : 0;
//
//            // Atualiza último path length
//            $this->cache->save("{$keyPrefix}_last_path_len", $pathLength, 300);
//
//            return array(
//                'robotCode' => $robotId,
//                'robotName' => $robot->robotName,
//                'progressPercent' => $progress,
//                'estimatedTimeRemaining' => $estimatedTime,
//                'pathLengthRemaining' => $pathLength,
//                'pathLengthTotal' => $totalPoints,
//            );
//        }
//
//        // Se não está mais executando tarefa, limpar cache
//        $this->clearTaskCache($robotId);
//        return array();
//    }
//
//    protected function clearTaskCache(string $robotId)
//    {
//        $prefix = "robot_task_{$robotId}";
//        $this->cache->delete("{$prefix}_path_total");
//        $this->cache->delete("{$prefix}_last_path_len");
//    }
//}

// GERADO PELO CLAUDE (v13)

//namespace App\Libraries;
//
//use Config\Services;
//
//class RobotTaskTracker 
//{
//    protected $cache;
//    
//    // Configurações do robô
//    const DEFAULT_LINEAR_SPEED = 1200; // mm/s - velocidade máxima teórica
//    const DEFAULT_ROTATION_SPEED = 90; // graus/s
//    const ROTATION_THRESHOLD = 5; // graus mínimos para considerar rotação
//    const MIN_PROGRESS_TIME = 30; // segundos mínimos antes de usar progresso observado
//    const POSITION_TOLERANCE = 50; // mm - tolerância para considerar que chegou ao ponto
//    
//    // Fatores de velocidade média (baseados na experiência real)
//    const SPEED_EFFICIENCY_FACTOR = 0.7; // 70% da velocidade máxima (considera paragens)
//    const MIN_AVERAGE_SPEED = 300; // mm/s - velocidade média mínima realista
//    const MAX_AVERAGE_SPEED = 900; // mm/s - velocidade média máxima realista
//    
//    public function __construct() 
//    {
//        $this->cache = Services::cache();
//    }
//    
//    public function processRobotData(object $robot) 
//    {
//        $robotId = $robot->robotCode;
//        $status = $robot->status;
//        $path = $robot->path;
//        $speed = max(floatval($robot->speed), 100); // Velocidade mínima de 100mm/s
//        $currentX = floatval($robot->posX);
//        $currentY = floatval($robot->posY);
//        $currentDir = floatval($robot->robotDir);
//        
//        if ($status == "2" && count($path) > 0) {
//            $keyPrefix = "robot_task_{$robotId}";
//            $now = time();
//            
//            // Primeira vez que entra em execução
//            if (!$this->cache->get("{$keyPrefix}_start_time")) {
//                // Calcular velocidade média estimada baseada na configuração
//                $estimatedAverageSpeed = $this->calculateEstimatedAverageSpeed($speed, $path);
//                
//                $totalTime = $this->calculateTotalPathTime($path, $currentX, $currentY, $currentDir, $estimatedAverageSpeed);
//                
//                $this->cache->save("{$keyPrefix}_start_time", $now, 1800);
//                $this->cache->save("{$keyPrefix}_initial_total_time", $totalTime, 1800);
//                $this->cache->save("{$keyPrefix}_initial_path_count", count($path), 1800);
//                $this->cache->save("{$keyPrefix}_estimated_avg_speed", $estimatedAverageSpeed, 1800);
//                $this->cache->save("{$keyPrefix}_last_update", $now, 1800);
//                $this->cache->save("{$keyPrefix}_last_position", json_encode(['x' => $currentX, 'y' => $currentY]), 1800);
//                $this->cache->save("{$keyPrefix}_total_distance", $this->calculateTotalDistance($path, $currentX, $currentY), 1800);
//                
//                return array(
//                    'robotCode' => $robotId,
//                    'robotName' => $robot->robotName,
//                    'progressPercent' => 0,
//                    'estimatedTimeRemaining' => round($totalTime, 1),
//                    'pathPointsRemaining' => count($path),
//                    'totalEstimatedTime' => round($totalTime, 1),
//                    'estimatedAverageSpeed' => round($estimatedAverageSpeed, 1),
//                    'method' => 'initial_estimate_with_avg_speed'
//                );
//            }
//            
//            // Recuperar dados do cache
//            $startTime = $this->cache->get("{$keyPrefix}_start_time");
//            $initialTotalTime = $this->cache->get("{$keyPrefix}_initial_total_time");
//            $initialPathCount = $this->cache->get("{$keyPrefix}_initial_path_count");
//            $estimatedAvgSpeed = $this->cache->get("{$keyPrefix}_estimated_avg_speed");
//            $lastUpdate = $this->cache->get("{$keyPrefix}_last_update");
//            $lastPositionJson = $this->cache->get("{$keyPrefix}_last_position");
//            $totalDistance = $this->cache->get("{$keyPrefix}_total_distance");
//            
//            $elapsedTime = $now - $startTime;
//            $timeSinceUpdate = $now - $lastUpdate;
//            
//            // Calcular progresso baseado nos pontos do path processados
//            $pathProgress = $this->calculatePathProgress($initialPathCount, count($path));
//            
//            // Calcular velocidade média real observada
//            $realAverageSpeed = $this->calculateRealAverageSpeed($totalDistance, $pathProgress, $elapsedTime);
//            
//            // Calcular tempo restante usando velocidade média adaptativa
//            $adaptiveSpeed = $this->getAdaptiveAverageSpeed($estimatedAvgSpeed, $realAverageSpeed, $elapsedTime);
//            $remainingTimeByPath = $this->calculateRemainingTime($path, $currentX, $currentY, $currentDir, $adaptiveSpeed);
//            
//            $estimatedTime = $remainingTimeByPath;
//            $method = 'adaptive_average_speed';
//            
//            // Só usar progresso observado se temos dados suficientes e progresso significativo
//            if ($elapsedTime >= self::MIN_PROGRESS_TIME && $pathProgress > 10) {
//                $observedProgressRate = $pathProgress / $elapsedTime; // % por segundo
//                
//                if ($observedProgressRate > 0.01) { // Pelo menos 0.01% por segundo
//                    $observedEstimate = (100 - $pathProgress) / $observedProgressRate;
//                    
//                    // Usar média ponderada, priorizando velocidade adaptativa
//                    $adaptiveWeight = 0.8;
//                    $observedWeight = 0.2;
//                    
//                    $estimatedTime = ($remainingTimeByPath * $adaptiveWeight) + ($observedEstimate * $observedWeight);
//                    $method = 'hybrid_adaptive_observed';
//                }
//            }
//            
//            // Garantir que o progresso nunca seja negativo ou superior a 100%
//            $progressPercent = max(0, min(100, $pathProgress));
//            
//            // Verificar se houve movimento significativo
//            $hasMovedSignificantly = $this->hasRobotMoved($currentX, $currentY, $lastPositionJson);
//            
//            // Se não houve movimento significativo há muito tempo, ajustar estimativa
//            if (!$hasMovedSignificantly && $timeSinceUpdate > 30) {
//                // Adicionar tempo extra por possível parada
//                $estimatedTime += min(60, $timeSinceUpdate); // Máximo 60s de penalidade
//                $method .= '_with_pause_adjustment';
//            }
//            
//            // Atualizar cache apenas se necessário
//            if ($timeSinceUpdate >= 5) { // Atualizar a cada 5 segundos
//                $this->cache->save("{$keyPrefix}_last_update", $now, 1800);
//                $this->cache->save("{$keyPrefix}_last_position", json_encode(['x' => $currentX, 'y' => $currentY]), 1800);
//            }
//            
//            return array(
//                'robotCode' => $robotId,
//                'robotName' => $robot->robotName,
//                'progressPercent' => round($progressPercent, 2),
//                'estimatedTimeRemaining' => max(0, round($estimatedTime, 1)),
//                'pathPointsRemaining' => count($path),
//                'totalEstimatedTime' => round($initialTotalTime, 1),
//                'elapsedTime' => $elapsedTime,
//                'method' => $method,
//                'configSpeed' => $speed,
//                'estimatedAverageSpeed' => round($estimatedAvgSpeed, 1),
//                'realAverageSpeed' => round($realAverageSpeed, 1),
//                'adaptiveSpeed' => round($adaptiveSpeed, 1),
//                'rotationsInPath' => $this->countRotations($path),
//                'currentDirection' => $currentDir,
//                'hasMovedSignificantly' => $hasMovedSignificantly
//            );
//        }
//        
//        // Se não está executando, limpar cache
//        $this->clearTaskCache($robotId);
//        return array();
//    }
//    
//    /**
//     * Calcula velocidade média estimada inicial baseada na configuração e complexidade do path
//     */
//    protected function calculateEstimatedAverageSpeed(float $configSpeed, array $path): float 
//    {
//        // Começar com fator de eficiência base
//        $efficiency = self::SPEED_EFFICIENCY_FACTOR;
//        
//        // Ajustar baseado na complexidade do caminho
//        $rotationCount = $this->countRotations($path);
//        $pathLength = count($path);
//        
//        // Mais rotações = menor eficiência
//        if ($rotationCount > 0) {
//            $rotationFactor = min(0.3, ($rotationCount / $pathLength) * 2); // Máximo 30% de redução
//            $efficiency -= $rotationFactor;
//        }
//        
//        // Caminhos muito longos tendem a ter mais variações
//        if ($pathLength > 50) {
//            $efficiency -= 0.05; // 5% adicional de redução
//        }
//        
//        $estimatedSpeed = $configSpeed * $efficiency;
//        
//        // Garantir que está dentro dos limites realistas
//        return max(self::MIN_AVERAGE_SPEED, min(self::MAX_AVERAGE_SPEED, $estimatedSpeed));
//    }
//    
//    /**
//     * Calcula velocidade média real baseada no progresso observado
//     */
//    protected function calculateRealAverageSpeed(float $totalDistance, float $progressPercent, int $elapsedTime): float 
//    {
//        if ($elapsedTime <= 0 || $progressPercent <= 0) {
//            return 0;
//        }
//        
//        $distanceCovered = ($totalDistance * $progressPercent) / 100;
//        $realSpeed = $distanceCovered / $elapsedTime; // mm/s
//        
//        // Filtrar valores irrealistas
//        if ($realSpeed < 50 || $realSpeed > 2000) {
//            return 0;
//        }
//        
//        return $realSpeed;
//    }
//    
//    /**
//     * Obtém velocidade média adaptativa que combina estimativa inicial com observação real
//     */
//    protected function getAdaptiveAverageSpeed(float $estimatedSpeed, float $realSpeed, int $elapsedTime): float 
//    {
//        // Se ainda não temos dados reais suficientes, usar estimativa
//        if ($elapsedTime < 60 || $realSpeed <= 0) {
//            return $estimatedSpeed;
//        }
//        
//        // Ponderar entre estimativa e realidade baseado no tempo decorrido
//        $realSpeedWeight = min(0.6, $elapsedTime / 300); // Máximo 60% após 5 minutos
//        $estimatedWeight = 1 - $realSpeedWeight;
//        
//        $adaptiveSpeed = ($estimatedSpeed * $estimatedWeight) + ($realSpeed * $realSpeedWeight);
//        
//        // Garantir limites realistas
//        return max(self::MIN_AVERAGE_SPEED, min(self::MAX_AVERAGE_SPEED, $adaptiveSpeed));
//    }
//    
//    /**
//     * Calcula distância total do path
//     */
//    protected function calculateTotalDistance(array $path, float $currentX, float $currentY): float 
//    {
//        if (empty($path)) return 0;
//        
//        $totalDistance = 0;
//        $lastX = $currentX;
//        $lastY = $currentY;
//        
//        foreach ($path as $pointStr) {
//            $coords = $this->parsePathPoint($pointStr);
//            if (!$coords) continue;
//            
//            list($x, $y, $dir) = $coords;
//            
//            $distance = sqrt(pow($x - $lastX, 2) + pow($y - $lastY, 2));
//            $totalDistance += $distance;
//            
//            $lastX = $x;
//            $lastY = $y;
//        }
//        
//        return $totalDistance;
//    }
//    
//    /**
//     * Calcula progresso baseado nos pontos do path processados
//     */
//    protected function calculatePathProgress(int $initialCount, int $currentCount): float 
//    {
//        if ($initialCount <= 0) return 0;
//        
//        $pointsProcessed = $initialCount - $currentCount;
//        return ($pointsProcessed / $initialCount) * 100;
//    }
//    
//    /**
//     * Verifica se o robô se moveu significativamente desde a última atualização
//     */
//    protected function hasRobotMoved(float $currentX, float $currentY, ?string $lastPositionJson): bool 
//    {
//        if (!$lastPositionJson) return true;
//        
//        $lastPosition = json_decode($lastPositionJson, true);
//        if (!$lastPosition) return true;
//        
//        $distance = sqrt(pow($currentX - $lastPosition['x'], 2) + pow($currentY - $lastPosition['y'], 2));
//        return $distance > self::POSITION_TOLERANCE;
//    }
//    
//    /**
//     * Calcula o tempo total estimado do caminho
//     */
//    protected function calculateTotalPathTime(array $path, float $currentX, float $currentY, float $currentDir, float $averageSpeed): float 
//    {
//        if (empty($path)) return 0;
//        
//        $totalTime = 0;
//        $lastX = $currentX;
//        $lastY = $currentY;
//        $lastDir = $currentDir;
//        
//        // Usar velocidade média ou padrão
//        $linearSpeed = max($averageSpeed, self::MIN_AVERAGE_SPEED);
//        $rotationSpeed = self::DEFAULT_ROTATION_SPEED;
//        
//        foreach ($path as $pointStr) {
//            $coords = $this->parsePathPoint($pointStr);
//            if (!$coords) continue;
//            
//            list($x, $y, $dir) = $coords;
//            
//            // Tempo de rotação
//            $rotationAngle = $this->calculateRotationAngle($lastDir, $dir);
//            if (abs($rotationAngle) > self::ROTATION_THRESHOLD) {
//                $rotationTime = abs($rotationAngle) / $rotationSpeed;
//                $totalTime += $rotationTime;
//            }
//            
//            // Tempo de movimento linear
//            $distance = sqrt(pow($x - $lastX, 2) + pow($y - $lastY, 2));
//            if ($distance > 0) {
//                $movementTime = $distance / $linearSpeed;
//                $totalTime += $movementTime;
//            }
//            
//            $lastX = $x;
//            $lastY = $y;
//            $lastDir = $dir;
//        }
//        
//        // Adicionar margem de segurança de 10%
//        return $totalTime * 1.1;
//    }
//    
//    /**
//     * Calcula tempo restante considerando posição atual
//     */
//    protected function calculateRemainingTime(array $path, float $currentX, float $currentY, float $currentDir, float $averageSpeed): float 
//    {
//        if (empty($path)) return 0;
//        
//        $totalTime = 0;
//        $lastX = $currentX;
//        $lastY = $currentY;
//        $lastDir = $currentDir;
//        
//        $linearSpeed = max($averageSpeed, self::MIN_AVERAGE_SPEED);
//        $rotationSpeed = self::DEFAULT_ROTATION_SPEED;
//        
//        foreach ($path as $pointStr) {
//            $coords = $this->parsePathPoint($pointStr);
//            if (!$coords) continue;
//            
//            list($x, $y, $dir) = $coords;
//            
//            // Tempo de rotação
//            $rotationAngle = $this->calculateRotationAngle($lastDir, $dir);
//            if (abs($rotationAngle) > self::ROTATION_THRESHOLD) {
//                $rotationTime = abs($rotationAngle) / $rotationSpeed;
//                $totalTime += $rotationTime;
//            }
//            
//            // Tempo de movimento
//            $distance = sqrt(pow($x - $lastX, 2) + pow($y - $lastY, 2));
//            if ($distance > 0) {
//                $movementTime = $distance / $linearSpeed;
//                $totalTime += $movementTime;
//            }
//            
//            $lastX = $x;
//            $lastY = $y;
//            $lastDir = $dir;
//        }
//        
//        return $totalTime;
//    }
//    
//    /**
//     * Parse um ponto do path
//     */
//    protected function parsePathPoint(string $pointStr): ?array 
//    {
//        $coords = explode(',', trim($pointStr, '[]'));
//        
//        if (count($coords) >= 3) {
//            return [
//                floatval($coords[0]), // x
//                floatval($coords[1]), // y
//                floatval($coords[2])  // direction
//            ];
//        }
//        
//        return null;
//    }
//    
//    /**
//     * Calcula o ângulo de rotação necessário
//     */
//    protected function calculateRotationAngle(float $fromDir, float $toDir): float 
//    {
//        $angle = $toDir - $fromDir;
//        
//        // Normalizar para -180 a +180 graus
//        while ($angle > 180) $angle -= 360;
//        while ($angle < -180) $angle += 360;
//        
//        return $angle;
//    }
//    
//    /**
//     * Conta rotações significativas no caminho
//     */
//    protected function countRotations(array $path): int 
//    {
//        if (count($path) < 2) return 0;
//        
//        $rotations = 0;
//        $lastDir = null;
//        
//        foreach ($path as $pointStr) {
//            $coords = $this->parsePathPoint($pointStr);
//            if (!$coords) continue;
//            
//            $dir = $coords[2];
//            
//            if ($lastDir !== null) {
//                $rotationAngle = abs($this->calculateRotationAngle($lastDir, $dir));
//                if ($rotationAngle > self::ROTATION_THRESHOLD) {
//                    $rotations++;
//                }
//            }
//            $lastDir = $dir;
//        }
//        
//        return $rotations;
//    }
//    
//    protected function clearTaskCache(string $robotId) 
//    {
//        $prefix = "robot_task_{$robotId}";
//        $keys = [
//            'start_time', 'initial_total_time', 'initial_path_count',
//            'estimated_avg_speed', 'last_update', 'last_position', 'total_distance'
//        ];
//        
//        foreach ($keys as $key) {
//            $this->cache->delete("{$prefix}_{$key}");
//        }
//    }
//}

// GERADO PELO CLAUDE v14
//namespace App\Libraries;
//
//use Config\Services;
//
//class RobotTaskTracker 
//{
//    protected $cache;
//    
//    // Constantes de configuração do robô
//    const MAX_LINEAR_SPEED = 1200;  // mm/s - velocidade máxima
//    const AVERAGE_SPEED_FACTOR = 0.7; // 70% da velocidade máxima como média
//    const ROTATION_SPEED = 90;      // graus/s - velocidade rotação
//    const ROTATION_THRESHOLD = 5;   // graus mínimos para considerar rotação
//    const MIN_DISTANCE = 10;        // mm mínimos para considerar movimento
//    const SMOOTHING_WINDOW = 30;    // segundos para suavização
//    const CURVE_SPEED_FACTOR = 0.6; // Redução velocidade em curvas
//    const ACCELERATION_FACTOR = 0.8; // Fator para aceleração/desaceleração
//    
//    public function __construct() 
//    {
//        $this->cache = Services::cache();
//    }
//    
//    public function processRobotData(object $robot) 
//    {
//        $robotId = $robot->robotCode;
//        $status = $robot->status;
//        $path = $robot->path;
//        $currentX = floatval($robot->posX);
//        $currentY = floatval($robot->posY);
//        $currentDir = floatval($robot->robotDir);
//        
//        if ($status == "2" && count($path) > 0) {
//            $keyPrefix = "robot_task_{$robotId}";
//            $now = time();
//            
//            // Primeira vez - inicializar
//            if (!$this->cache->get("{$keyPrefix}_start_time")) {
//                return $this->initializeTask($keyPrefix, $path, $currentX, $currentY, $currentDir, $robot, $now);
//            }
//            
//            // Recuperar dados do cache
//            $startTime = $this->cache->get("{$keyPrefix}_start_time");
//            $initialTotalTime = $this->cache->get("{$keyPrefix}_initial_total_time");
//            $lastUpdate = $this->cache->get("{$keyPrefix}_last_update");
//            $lastPathCount = $this->cache->get("{$keyPrefix}_last_path_count");
//            $lastPosition = $this->cache->get("{$keyPrefix}_last_position");
//            
//            // Calcular tempo restante baseado no path atual
//            $remainingTime = $this->calculateRemainingTimeFromPath($path, $currentX, $currentY, $currentDir);
//            
//            // Calcular progresso baseado no tempo inicial vs restante
//            $progress = $this->calculateProgress($initialTotalTime, $remainingTime);
//            
//            // Ajustar estimativa baseada no progresso real observado
//            $adjustedEstimate = $this->adjustEstimateBasedOnProgress(
//                $startTime, 
//                $now, 
//                $initialTotalTime, 
//                $remainingTime,
//                $lastUpdate,
//                $lastPathCount,
//                count($path)
//            );
//            
//            // Detectar se o robô está realmente a progredir
//            $isProgressing = $this->isRobotProgressing($lastPosition, $currentX, $currentY, $lastPathCount, count($path));
//            
//            // Atualizar cache
//            $this->updateCache($keyPrefix, $now, count($path), $currentX, $currentY);
//            
//            return array(
//                'robotCode' => $robotId,
//                'robotName' => $robot->robotName,
//                'progressPercent' => max(0, min(100, $progress)), // Garantir entre 0-100%
//                'estimatedTimeRemaining' => max(0, $adjustedEstimate),
//                'pathPointsRemaining' => count($path),
//                'totalEstimatedTime' => round($initialTotalTime, 1),
//                'elapsedTime' => $now - $startTime,
//                'method' => $this->getEstimationMethod($now - $startTime),
//                'isProgressing' => $isProgressing,
//                'rotationsInPath' => $this->countRotations($path),
//                'currentDirection' => $currentDir,
//                'pathComplexity' => $this->analyzePathComplexity($path)['complexity'],
//                'averageSpeed' => round(self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR)
//            );
//        }
//        
//        // Limpar cache se não está a executar tarefa
//        $this->clearTaskCache($robotId);
//        return array();
//    }
//    
//    /**
//     * Inicializar nova tarefa
//     */
//    protected function initializeTask($keyPrefix, $path, $currentX, $currentY, $currentDir, $robot, $now)
//    {
//        $totalTime = $this->calculateRemainingTimeFromPath($path, $currentX, $currentY, $currentDir);
//        
//        $this->cache->save("{$keyPrefix}_start_time", $now, 1800);
//        $this->cache->save("{$keyPrefix}_initial_total_time", $totalTime, 1800);
//        $this->cache->save("{$keyPrefix}_last_update", $now, 1800);
//        $this->cache->save("{$keyPrefix}_last_path_count", count($path), 1800);
//        $this->cache->save("{$keyPrefix}_last_position", [$currentX, $currentY], 1800);
//        
//        return array(
//            'robotCode' => $robot->robotCode,
//            'robotName' => $robot->robotName,
//            'progressPercent' => 0,
//            'estimatedTimeRemaining' => round($totalTime, 1),
//            'pathPointsRemaining' => count($path),
//            'totalEstimatedTime' => round($totalTime, 1),
//            'method' => 'initial_calculation',
//            'isProgressing' => true,
//            'rotationsInPath' => $this->countRotations($path),
//            'currentDirection' => $currentDir,
//            'pathComplexity' => $this->analyzePathComplexity($path)['complexity'],
//            'averageSpeed' => round(self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR)
//        );
//    }
//    
//    /**
//     * Calcular tempo restante baseado nos pontos do path
//     */
//    protected function calculateRemainingTimeFromPath(array $path, float $currentX, float $currentY, float $currentDir): float 
//    {
//        if (empty($path)) {
//            return 0;
//        }
//        
//        $totalTime = 0;
//        $lastX = $currentX;
//        $lastY = $currentY;
//        $lastDir = $currentDir;
//        
//        // Analisar o path para determinar complexidade
//        $pathComplexity = $this->analyzePathComplexity($path);
//        
//        foreach ($path as $index => $pointStr) {
//            $coords = explode(',', trim($pointStr, '[]'));
//            
//            if (count($coords) >= 3) {
//                $x = floatval($coords[0]);
//                $y = floatval($coords[1]);
//                $dir = floatval($coords[2]);
//                
//                // Tempo de rotação
//                $rotationAngle = $this->calculateRotationAngle($lastDir, $dir);
//                if (abs($rotationAngle) > self::ROTATION_THRESHOLD) {
//                    $rotationTime = abs($rotationAngle) / self::ROTATION_SPEED;
//                    $totalTime += $rotationTime;
//                    
//                    // Tempo adicional para estabilização após rotação
//                    $totalTime += 0.5; // 500ms para estabilizar
//                }
//                
//                // Calcular velocidade apropriada para este segmento
//                $distance = sqrt(pow($x - $lastX, 2) + pow($y - $lastY, 2));
//                if ($distance > self::MIN_DISTANCE) {
//                    $segmentSpeed = $this->calculateSegmentSpeed($distance, $rotationAngle, $index, count($path), $pathComplexity);
//                    $movementTime = $distance / $segmentSpeed;
//                    $totalTime += $movementTime;
//                }
//                
//                $lastX = $x;
//                $lastY = $y;
//                $lastDir = $dir;
//            }
//        }
//        
//        return $totalTime;
//    }
//    
//    /**
//     * Analisar complexidade do path para ajustar velocidades
//     */
//    protected function analyzePathComplexity(array $path): array
//    {
//        $rotations = $this->countRotations($path);
//        $totalDistance = 0;
//        $shortSegments = 0;
//        
//        for ($i = 1; $i < count($path); $i++) {
//            $prevCoords = explode(',', trim($path[$i-1], '[]'));
//            $currCoords = explode(',', trim($path[$i], '[]'));
//            
//            if (count($prevCoords) >= 2 && count($currCoords) >= 2) {
//                $distance = sqrt(
//                    pow(floatval($currCoords[0]) - floatval($prevCoords[0]), 2) + 
//                    pow(floatval($currCoords[1]) - floatval($prevCoords[1]), 2)
//                );
//                $totalDistance += $distance;
//                
//                if ($distance < 500) { // Segmentos menores que 50cm
//                    $shortSegments++;
//                }
//            }
//        }
//        
//        $avgDistance = count($path) > 1 ? $totalDistance / (count($path) - 1) : 0;
//        
//        return [
//            'rotations' => $rotations,
//            'avgDistance' => $avgDistance,
//            'shortSegments' => $shortSegments,
//            'totalDistance' => $totalDistance,
//            'complexity' => $this->calculateComplexityScore($rotations, $shortSegments, count($path))
//        ];
//    }
//    
//    /**
//     * Calcular score de complexidade do path (0-1, onde 1 = mais complexo)
//     */
//    protected function calculateComplexityScore(int $rotations, int $shortSegments, int $totalPoints): float
//    {
//        $rotationRatio = $totalPoints > 0 ? $rotations / $totalPoints : 0;
//        $shortSegmentRatio = $totalPoints > 0 ? $shortSegments / $totalPoints : 0;
//        
//        // Combinar fatores de complexidade
//        $complexity = ($rotationRatio * 0.6) + ($shortSegmentRatio * 0.4);
//        
//        return min(1.0, $complexity);
//    }
//    
//    /**
//     * Calcular velocidade apropriada para um segmento específico
//     */
//    protected function calculateSegmentSpeed(float $distance, float $rotationAngle, int $segmentIndex, int $totalSegments, array $complexity): float
//    {
//        $baseSpeed = self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR;
//        
//        // Reduzir velocidade baseado na complexidade geral do path
//        $complexityReduction = $complexity['complexity'] * 0.3; // Até 30% de redução
//        $baseSpeed *= (1 - $complexityReduction);
//        
//        // Ajustar baseado no segmento específico
//        $segmentSpeed = $baseSpeed;
//        
//        // Reduzir velocidade em segmentos curtos (aceleração/desaceleração)
//        if ($distance < 300) { // Menos de 30cm
//            $segmentSpeed *= 0.5;
//        } elseif ($distance < 800) { // Menos de 80cm
//            $segmentSpeed *= 0.7;
//        }
//        
//        // Reduzir velocidade se há rotação significativa no segmento
//        if (abs($rotationAngle) > 15) {
//            $segmentSpeed *= self::CURVE_SPEED_FACTOR;
//        }
//        
//        // Reduzir velocidade no início e fim do path (aceleração/desaceleração)
//        if ($segmentIndex < 3 || $segmentIndex > ($totalSegments - 4)) {
//            $segmentSpeed *= self::ACCELERATION_FACTOR;
//        }
//        
//        // Garantir velocidade mínima e máxima
//        $segmentSpeed = max(200, min(self::MAX_LINEAR_SPEED, $segmentSpeed));
//        
//        return $segmentSpeed;
//    }
//    
//    /**
//     * Calcular progresso baseado no tempo inicial vs restante
//     */
//    protected function calculateProgress(float $initialTime, float $remainingTime): float
//    {
//        if ($initialTime <= 0) {
//            return 0;
//        }
//        
//        $progress = (1 - ($remainingTime / $initialTime)) * 100;
//        return round($progress, 2);
//    }
//    
//    /**
//     * Ajustar estimativa baseada no progresso real observado
//     */
//    protected function adjustEstimateBasedOnProgress($startTime, $now, $initialTime, $remainingTime, $lastUpdate, $lastPathCount, $currentPathCount)
//    {
//        $elapsedTime = $now - $startTime;
//        
//        // Para tarefas muito recentes, usar cálculo teórico
//        if ($elapsedTime < 30) {
//            return round($remainingTime, 1);
//        }
//        
//        // Calcular taxa de progresso real
//        $timeSpent = $initialTime - $remainingTime;
//        if ($timeSpent <= 0 || $elapsedTime <= 0) {
//            return round($remainingTime, 1);
//        }
//        
//        $realProgressRate = $timeSpent / $elapsedTime; // progresso teórico por segundo real
//        
//        // Verificar se a taxa é realista (evitar divisões por valores muito pequenos)
//        if ($realProgressRate <= 0 || $realProgressRate > 10) {
//            return round($remainingTime, 1);
//        }
//        
//        // Estimar tempo restante baseado na taxa real
//        $adjustedEstimate = $remainingTime / $realProgressRate;
//        
//        // Suavizar com média ponderada (dar mais peso ao cálculo teórico se a diferença for muito grande)
//        $theoreticalEstimate = $remainingTime;
//        $weight = min(0.7, $elapsedTime / 120); // Aumentar peso da estimativa real ao longo do tempo
//        
//        $finalEstimate = ($adjustedEstimate * $weight) + ($theoreticalEstimate * (1 - $weight));
//        
//        return round(max(0, $finalEstimate), 1);
//    }
//    
//    /**
//     * Verificar se o robô está realmente a progredir
//     */
//    protected function isRobotProgressing($lastPosition, $currentX, $currentY, $lastPathCount, $currentPathCount): bool
//    {
//        // Verificar se o número de pontos diminuiu
//        if ($lastPathCount > $currentPathCount) {
//            return true;
//        }
//        
//        // Verificar se houve movimento significativo
//        if (is_array($lastPosition) && count($lastPosition) >= 2) {
//            $distance = sqrt(pow($currentX - $lastPosition[0], 2) + pow($currentY - $lastPosition[1], 2));
//            return $distance > 50; // Movimento mínimo de 5cm
//        }
//        
//        return true; // Por defeito assumir que está a progredir
//    }
//    
//    /**
//     * Obter método de estimativa usado
//     */
//    protected function getEstimationMethod(int $elapsedTime): string
//    {
//        if ($elapsedTime < 30) {
//            return 'theoretical_calculation';
//        } elseif ($elapsedTime < 120) {
//            return 'mixed_estimation';
//        } else {
//            return 'progress_based_adjustment';
//        }
//    }
//    
//    /**
//     * Calcular ângulo de rotação necessário entre duas direções
//     */
//    protected function calculateRotationAngle(float $fromDir, float $toDir): float 
//    {
//        $angle = $toDir - $fromDir;
//        
//        // Normalizar para -180 a +180 graus
//        while ($angle > 180) {
//            $angle -= 360;
//        }
//        while ($angle < -180) {
//            $angle += 360;
//        }
//        
//        return $angle;
//    }
//    
//    /**
//     * Contar rotações significativas no path
//     */
//    protected function countRotations(array $path): int 
//    {
//        if (count($path) < 2) {
//            return 0;
//        }
//        
//        $rotations = 0;
//        $lastDir = null;
//        
//        foreach ($path as $pointStr) {
//            $coords = explode(',', trim($pointStr, '[]'));
//            if (count($coords) >= 3) {
//                $dir = floatval($coords[2]);
//                
//                if ($lastDir !== null) {
//                    $rotationAngle = abs($this->calculateRotationAngle($lastDir, $dir));
//                    if ($rotationAngle > self::ROTATION_THRESHOLD) {
//                        $rotations++;
//                    }
//                }
//                $lastDir = $dir;
//            }
//        }
//        
//        return $rotations;
//    }
//    
//    /**
//     * Atualizar dados no cache
//     */
//    protected function updateCache($keyPrefix, $now, $pathCount, $currentX, $currentY)
//    {
//        $this->cache->save("{$keyPrefix}_last_update", $now, 1800);
//        $this->cache->save("{$keyPrefix}_last_path_count", $pathCount, 1800);
//        $this->cache->save("{$keyPrefix}_last_position", [$currentX, $currentY], 1800);
//    }
//    
//    /**
//     * Limpar dados do cache
//     */
//    protected function clearTaskCache(string $robotId) 
//    {
//        $prefix = "robot_task_{$robotId}";
//        $this->cache->delete("{$prefix}_start_time");
//        $this->cache->delete("{$prefix}_initial_total_time");
//        $this->cache->delete("{$prefix}_last_update");
//        $this->cache->delete("{$prefix}_last_path_count");
//        $this->cache->delete("{$prefix}_last_position");
//    }
//}

// CLAUDE v16
namespace App\Libraries;

use Config\Services;

class RobotTaskTracker_bak
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
        
        if ($status == "2" && count($path) > 0) {
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
            
            // Detectar se está progredindo
            $isProgressing = $this->isRobotProgressing($lastPosition, $currentX, $currentY, $smoothedProgress, $lastProgress);
            
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
                'averageSpeed' => $this->calculateCurrentSpeed($lastPosition, $currentX, $currentY, $lastUpdate, $now)
            );
        }
        
        // Limpar cache se não está a executar tarefa
        $this->clearTaskCache($robotId);
        return array();
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
            'averageSpeed' => round(self::MAX_LINEAR_SPEED * self::AVERAGE_SPEED_FACTOR)
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
     * Verificar se o robô está progredindo
     */
    protected function isRobotProgressing(array $lastPosition, float $currentX, float $currentY, float $currentProgress, float $lastProgress): bool
    {
        // Verificar progresso percentual
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