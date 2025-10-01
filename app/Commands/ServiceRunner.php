<?php namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class ServiceRunner extends BaseCommand {
    protected $group       = 'Custom';
    protected $name        = 'thekid:start';
    protected $description = 'Mantém comandos Spark sempre em execução com auto-restart e logging.';

    protected $commands = [];

    protected $restartDelay = 3; // segundos entre restart se crashar

    // --- NOVO ---
    // Defina o intervalo de reinício em segundos (Ex: 6 horas)
    const RESTART_INTERVAL = 4 * 3600; 

    public function run(array $params)
    {
        CLI::write("A iniciar serviço de monitorização...", 'yellow');

        $this->commands = [
        [
            'cmd' => 'php ' . ROOTPATH . 'spark websocket:start',
            'log' => WRITEPATH . 'logs/websocket.log',
        ],
        [
            'cmd' => 'php ' . ROOTPATH . 'spark schedule-tasks:start',
            'log' => WRITEPATH . 'logs/job.log',
        ],
    ];

        $processes = [];
        //echo json_encode($this->commands);

        // Setup inicial
        foreach ($this->commands as $config) {
            CLI::write("A iniciar " . $config["cmd"], "yellow");
            $proc = $this->startProcess($config);
            if ($proc) {
                // --- NOVO: Guardar a hora de início ---
                $proc['startTime'] = time();
                $processes[] = $proc;
            }
        }

        // Loop principal
        while (true) {
            foreach ($processes as $index => &$proc) {
                
                // 1. Lógica existente: Verificar se o processo parou inesperadamente e reiniciar
                $status = proc_get_status($proc['resource']);
                if ($status === false || $status['running'] === false) {
                    $exitCode = $status['exitcode'] ?? 'N/A';
                    
                    // Log do output ANTES de fechar (limpa os pipes)
                    $this->logProcessOutput($proc);
                    
                    CLI::error("Processo parou inesperadamente (Código: {$exitCode}): " . $proc['cmd'], 'red');
                    $this->closeProcess($proc);
                    sleep($this->restartDelay);
                    
                    // Tentativa de restart
                    $newProc = $this->startProcess($this->commands[$index]);
                    if ($newProc) {
                        // --- NOVO: Atualizar a hora de início no restart ---
                        $newProc['startTime'] = time(); 
                        $processes[$index] = $newProc;
                        CLI::write("✅ Reiniciado (Crash): " . $newProc['cmd'], 'green');
                    } else {
                        CLI::error("Falha CRÍTICA ao reiniciar o processo: " . $proc['cmd'], 'red');
                    }
                    continue; // Passa para o próximo processo
                }
                
                // 2. Lógica nova: Reinício Programado (Memory Leak Mitigation)
                if (time() - $proc['startTime'] > self::RESTART_INTERVAL) {
                    
                    // Log do output antes de fechar (limpa os pipes)
                    $this->logProcessOutput($proc);
                    
                    CLI::write("⏰ Reinício programado do processo para limpar a memória: " . $proc['cmd'], 'cyan');
                    
                    // Ações de fecho
                    $this->closeProcess($proc); 
                    sleep($this->restartDelay); // Espera um pouco

                    // Início do processo
                    $newProc = $this->startProcess($this->commands[$index]);
                    if ($newProc) {
                        $newProc['startTime'] = time(); // Reinicia o contador de tempo
                        $processes[$index] = $newProc;
                        CLI::write("✅ Reiniciado (Programado): " . $newProc['cmd'], 'green');
                    } else {
                        CLI::error("Falha CRÍTICA ao reiniciar o processo: " . $proc['cmd'], 'red');
                    }
                    continue; // Passa para o próximo processo
                }

                // Lógica existente/Corrigida: Leitura e log do output (contínua)
                $this->logProcessOutput($proc);

            }
            // Faz sleep para evitar 100% de CPU
            sleep(1); 
        }
    }

    // ====================================================================
    // --- NOVO MÉTODO ---
    // ====================================================================
    
    /**
     * Lê a saída dos pipes STDOUT e STDERR do processo e escreve no ficheiro de log.
     */
    protected function logProcessOutput(array &$proc)
    {
        // Se o recurso de log não estiver aberto, não faz nada
        if (!is_resource($proc['log'])) {
            return;
        }

        // Lê e escreve STDOUT (pipes[1])
        $output = stream_get_contents($proc['pipes'][1]);
        if (!empty($output)) {
            fwrite($proc['log'], $output);
            fflush($proc['log']); // Garante que é escrito no disco
        }

        // Lê e escreve STDERR (pipes[2])
        $error = stream_get_contents($proc['pipes'][2]);
        if (!empty($error)) {
            // Adiciona um prefixo para identificar a origem do erro no log
            $prefixedError = "[\" . date('Y-m-d H:i:s') . \"] [STDERR] " . trim($error) . "\n";
            fwrite($proc['log'], $prefixedError);
            fflush($proc['log']);
        }
    }
    
    // ====================================================================
    // MÉTODOS AUXILIARES (startProcess, closeProcess - assumidos como existentes)
    // ====================================================================

    protected function startProcess(array $config)
    {
        // O restante do seu método startProcess existente
        // ...
        $descriptorspec = array(
            0 => array("pipe", "r"),  // stdin
            1 => array("pipe", "w"),  // stdout
            2 => array("pipe", "w")   // stderr
        );

        $process = proc_open($config['cmd'], $descriptorspec, $pipes);
        echo "A iniciar processo " . $config['cmd'];
        CLI::write("A iniciar processo" . $config["cmd"], "yellow");

        if (!is_resource($process)) {
            CLI::error("Erro ao iniciar: " . $config['cmd']);
            echo "Erro ao iniciar: " . $config['cmd'];
            return null;
        }

        // Torna os pipes não-bloqueantes
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $logFile = fopen($config['log'], 'a'); // Sempre reabre para append
        if (!is_resource($logFile)) {
             CLI::error("Não foi possível abrir o ficheiro de log: " . $config['log']);
             return null;
        }

        fwrite($logFile, "[" . date('Y-m-d H:i:s') . "] Iniciado: {$config['cmd']}\\n");

        return [
            'resource' => $process,
            'pipes'    => $pipes,
            'cmd'      => $config['cmd'],
            'log'      => $logFile, // Retorna o recurso de ficheiro aberto
            'logPath'  => $config['log']
        ];
    }

    protected function closeProcess(array &$proc)
    {
        // Tenta parar o processo
        @proc_terminate($proc['resource']);

        // Fecha os pipes
        foreach ($proc['pipes'] as $pipe) {
            if (is_resource($pipe)) { 
                fclose($pipe);
            }
        }
        
        // Fecha o recurso do ficheiro de log
        if (is_resource($proc['log'])) {
            fclose($proc['log']);
        }
        
        // Limpa a referência ao processo e recurso
        proc_close($proc['resource']);
        unset($proc['resource']);
        unset($proc['log']);
    }
}