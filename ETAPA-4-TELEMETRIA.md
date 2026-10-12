# SNES Nova — Etapa 4: Telemetria de core e diagnóstico (12/10/2026)

Esta entrega é acumulativa: contém integralmente as Etapas 1, 2 e 3.

## O que está implementado

- **Boot medido:** `SNESNova.coreTelemetry.start(...)`, `ready(token)` e `running(token)` registram, com relógio monotônico do navegador, os tempos `readyMs` e `bootMs`. A sessão e a ROM possuem token, nome do core e hash próprios.
- **Ponte para cores instrumentados:** `SNESNova.coreTelemetry.frame({token,coreMs,ppuMs,dspMs})` aceita **uma chamada por frame realmente concluído pela emulação**; só então calcula FPS efetivos em janelas de pelo menos 3 s / 120 frames. Os tempos por subsistema são opcionais e devem ser medidos **dentro do core**, nunca estimados pelo requestAnimationFrame.
- **Underruns verdadeiros, opcionais:** `SNESNova.coreTelemetry.audioUnderrun({token,count})` conta apenas underruns sinalizados por hook de áudio no core/runtime. Sem hook, a métrica é `null`/indisponível (não zero).
- **Identidade e regiões:** amostras usam token da sessão, core, hash e meta de 50 Hz em PAL / 60 Hz em NTSC. Amostras velhas ou incompatíveis são ignoradas. Pausas de aba e lacunas longas invalidam apenas a janela atual.
- **Interface e exportação:** `#sessionPerf` diferencia cadência da tela de FPS do core; painel Diagnóstico inclui boot, FPS e underruns quando medidos. JSON inclui `coreTelemetry` e `lastCoreTelemetry`, inclusive o último encerramento. Estatísticas de tela não são mais persistidas como `sessionFps`.
- **Resiliência:** callbacks de runtime atrasados não reativam uma sessão já encerrada. Corrigida a leitura da região do objeto real `romInfo.region`.
- **Cache:** versão de assets e SW alterada para `1.5.0-etapa4`.

## Integração real com um core modificado (IMPORTANTE)

Os binários do Snes9x/bsnes **não foram modificados nem incluídos**. O pacote conserva a seleção EmulatorJS original. A interface pública documentada oferece eventos como `EJS_ready` e `EJS_onGameStart`, **mas não fornece um contador de frames emulados ou de underruns**. A ponte abaixo somente produzirá FPS emulado se um core customizado enviar os dados corretos.

Contrato para o desenvolvedor do runtime/port libretro:

1. Ao iniciar a sessão, obtenha `const token = window.SNESNova.session.snapshot().token`. Guarde esse token **para este boot** (não o consulte novamente a cada frame).
2. No retorno da **execução de cada frame completo do core** (por exemplo, integração do loop que chama o `retro_run()` no port libretro), notifique a janela principal com `window.SNESNova.coreTelemetry.frame({token})`. Um callback de `requestAnimationFrame`, `canvas`, GPU ou vídeo duplicado **não equivale a um frame do core**.
3. Se houver tempos reais medidos pelo core, passe `{token, coreMs, ppuMs, dspMs}` em milissegundos; campos desconhecidos devem ser omitidos. O `p95` é calculado a partir de tempos explícitos, não do relógio de apresentação do navegador.
4. Se o sistema de som realmente expuser eventos de esvaziamento do buffer, chame `audioUnderrun({token,count:1})` por ocorrência. **Não derive underruns de áudio a partir de FPS baixo.**
5. Se o core rodar num Worker, a camada customizada do runtime deve encaminhar explicitamente contagens confirmadas para a janela principal; **não há observação automática de mensagens privadas do Worker**. Preserve o token original na transmissão.
6. Não modifique os arquivos do Snes9x/bsnes distribuídos por terceiros sem revisar compatibilidade, versão e licenças.

**Exemplo conceitual (apenas para um adaptador integrado ao core, NÃO chame num timer):**

```js
// Após a execução de cada frame pelo emulador, no adaptador customizado:
window.SNESNova.coreTelemetry.frame({ token: initialSessionToken });
// Se houver contador explícito de buffer vazio no áudio:
window.SNESNova.coreTelemetry.audioUnderrun({ token: initialSessionToken, count: 1 });
```

Os sinais `snesnova:emulationmetrics` são produzidos pelo bridge após pelo menos 3 s/120 frames; `session-manager.js` os valida e publica `snesnova:coreperformance`. Nenhum core é trocado somente por métricas de tela. A API de eventos é diagnóstico/integração da aplicação, não fronteira de segurança contra scripts maliciosos que tenham execução na mesma página.

## Testes executados

Executar `bash tests/smoke.sh`. Inclui:
- Todas as verificações de sintaxe e JSON e regressões anteriores;
- ROMs: Doom/LoROM/Super FX, Final Fight/LoROM e Final Fight 3/HiROM;
- Entradas ZIP/SMC, CRC, proteção contra ZIPs inválidos;
- Cadências de tela 50/60/90/120/144 Hz, distinção FPS/tela;
- Telemetria simulada **no teste** (contagens de frames determinísticas a 60 e 50 Hz), tempos p95, underruns explícitos, tokens falsos, encerramento e abas ocultas.

**Os valores produzidos pelos testes são simulados por relógio injetado. Não representam partidas reais ou desempenho observado de Doom/Final Fight.**

## Limitações / ação para a Etapa 5

- Ainda não foram feitos testes de jogabilidade, áudio ou frames reais em navegador com os binários WASM. O ZIP original e esta etapa não incluem runtime EmulatorJS completo; consulte `scripts/install-runtime.sh` ou `scripts/install-runtime.ps1`.
- Sem um runtime instrumentado, FPS emulado, tempos de CPU/PPU/DSP e underruns permanecerão *indisponíveis*. O tempo de inicialização funciona com os callbacks EJS existentes, quando o jogo carrega.
- A próxima etapa deve integrar **um build reproduzível e versionado** de pelo menos um core, executar ROMs de teste autorizadas, coletar telemetria real em dispositivos alvo e comparar com a versão estável. Não afirmar melhorias de desempenho sem essas medições.
- O arquivo inclui ROMs comerciais herdadas do projeto fornecido. Verificar direitos de redistribuição antes de disponibilizar publicamente.

Referência da API EmulatorJS: https://emulatorjs.org/docs/options/
