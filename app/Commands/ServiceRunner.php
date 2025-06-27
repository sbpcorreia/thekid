<?php namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class ServiceRunner extends BaseCommand {
    protected $group       = 'Custom';
    protected $name        = 'thekid:start';
    protected $description = 'Mantém comandos Spark sempre em execução com auto-restart e logging.';

    protected $commands = [];

    protected $restartDelay = 3; // segundos entre restart se crashar

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
        echo json_encode($this->commands);

        // Setup inicial
        foreach ($this->commands as $config) {
            CLI::write("A iniciar " . $config["cmd"], "yellow");
            $proc = $this->startProcess($config);
            if ($proc) {
                $processes[] = $proc;
            }
        }

        // Loop principal
        while (true) {
            foreach ($processes as $index => &$proc) {
                // Certifique-se que o log está aberto antes de escrever
                // Isso é importante caso o processo tenha sido reiniciado e o recurso 'log' anterior tenha sido fechado
                if (!is_resource($proc['log'])) {
                    $proc['log'] = fopen($proc['logPath'], 'a');
                    if (!is_resource($proc['log'])) {
                        CLI::error("Não foi possível reabrir o ficheiro de log: " . $proc['logPath']);
                        // Pode querer adicionar uma lógica para parar ou tentar novamente
                        continue; // Passa para o próximo processo
                    }
                }

                $status = proc_get_status($proc['resource']);

                // Output live
                $stdout = stream_get_contents($proc['pipes'][1]);
                $stderr = stream_get_contents($proc['pipes'][2]);

                if ($stdout !== '') {
                    CLI::write("[" . $proc['cmd'] . "]: " . trim($stdout));
                    fwrite($proc['log'], "[" . date('H:i:s') . "] OUT: $stdout");
                }

                if ($stderr !== '') {
                    CLI::error("[" . $proc['cmd'] . "]: " . trim($stderr));
                    fwrite($proc['log'], "[" . date('H:i:s') . "] ERR: $stderr");
                }

                // Se morreu, reiniciar
                if (!$status['running']) {
                    CLI::error("❌ Processo morreu: " . $proc['cmd']);
                    $this->closeProcess($proc); // Fecha os pipes e o log do processo falhado
                    CLI::write("⏳ A reiniciar após {$this->restartDelay}s...", 'light_gray');
                    sleep($this->restartDelay);

                    // Restart
                    $newProc = $this->startProcess([
                        'cmd' => $proc['cmd'],
                        'log' => $proc['logPath']
                    ]);
                    if ($newProc) {
                        $processes[$index] = $newProc;
                        CLI::write("✅ Reiniciado: " . $newProc['cmd'], 'green');
                    } else {
                        CLI::error("Falha ao reiniciar o processo: " . $proc['cmd'], 'red');
                    }
                }
            }

            usleep(250000); // 250ms
        }
    }

    protected function startProcess(array $config)
    {
        $descriptorspec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'], // stdout
            2 => ['pipe', 'w'], // stderr
        ];

        // Certifica-se que o comando é executável via shell
        // No Windows, pode ser necessário 'start /b cmd /c <command>' para processos em segundo plano
        // No Linux, os pipes já gerem isso
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
             // Não fecha os pipes do processo, mas retorna null
             return null;
        }

        fwrite($logFile, "[" . date('Y-m-d H:i:s') . "] Iniciado: {$config['cmd']}\n");

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
        foreach ($proc['pipes'] as $pipe) {
            if (is_resource($pipe)) { // Verifica se o pipe ainda é um recurso válido
                fclose($pipe);
            }
        }
        if (is_resource($proc['log'])) { // Verifica se o log ainda é um recurso válido
            fclose($proc['log']);
        }
        if (is_resource($proc['resource'])) { // Verifica se o processo ainda é um recurso válido
            proc_close($proc['resource']);
        }
    }
}