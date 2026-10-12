# SNES Nova Engine v1

A camada Engine v1 fica acima do EmulatorJS/Snes9x/bsnes e controla decisões que pertencem ao frontend/runtime: detecção de capacidades, perfis por dispositivo+jogo, prefetch/warm-up, escala inteira, monitoramento de frame pacing, polling de gamepad, workers e preparação para builds WebAssembly próprios.

## O que é real nesta versão
- detecção WebAssembly SIMD, threads, WebGL2, Worker, OffscreenCanvas e AudioWorklet;
- device profile não identificável;
- perfil aprendido por ROM + classe de hardware **somente** quando houver telemetria de frames fornecida por um core instrumentado;
- prefetch/warm-up do loader local;
- worker para hash CRC32/SHA-256 sem bloquear a UI;
- gerenciamento de input por `requestAnimationFrame` durante a sessão;
- escala inteira calculada pela viewport;
- medição de cadência da tela (requestAnimationFrame) separada de FPS de emulação; fallback por baixa velocidade somente com dados de frames do core instrumentado;
- infraestrutura versionada para cores customizados.

## Cores customizados
Os binários Snes9x/bsnes continuam sendo os runtimes aprovados do projeto até que um build customizado seja produzido. Recompilar o core exige o código-fonte upstream e Emscripten; `scripts/core-build/` fornece o ponto de entrada e força pins explícitos de commits, evitando baixar/compilar código mutável silenciosamente.

## Etapa 3 — dados de desempenho e limitações

A medição de `requestAnimationFrame` descreve somente a regularidade dos callbacks de tela (50/60/90/120/144 Hz). **Não revela FPS do jogo nem garante velocidade normal de emulação.** Cores Snes9x/bsnes não acompanham este ZIP como binários locais completos e não expõem aqui um contador independente de frames emulados. As métricas de emulação ficam indisponíveis até que um core instrumentado forneça `snesnova:emulationmetrics` com `source: 'core'`, `emulatedFrames`, `elapsedMs`, `targetHz`, `core` e `hash`. O arquivo `performance-metrics.js` valida a amostra; nenhum valor é simulado.

O segundo canvas WebGL2 é **desativado por padrão**, opcional quando ativado manualmente, limitado a 50/60 uploads por segundo e limpo ao encerrar. A reprodução do core continua sendo a referência; filtro no navegador custa processamento adicional. O seletor de áudio ainda não tem controle confirmado de buffers internos, por isso não afirma aplicar baixa latência ou corrigir underruns. Antes de publicar números de ganho, execute ensaios reais com builds do core e equipamentos específicos.
