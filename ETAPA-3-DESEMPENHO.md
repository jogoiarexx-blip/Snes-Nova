# SNES Nova — Etapa 3: desempenho e sincronização (2026-10-12)

Continuação integral da Etapa 2: todas as correções de inicialização, ZIP/SMC e compatibilidade foram preservadas.

## Implementado

1. **Métricas com significado correto:** módulo testável `performance-metrics.js`. Monitora a cadência de `requestAnimationFrame` sem chamá-la de FPS do jogo. Calcula taxa de callbacks, mediana de refresh, 1% low da tela, p99 e atrasos relativos ao refresh real (incluindo 90/120/144 Hz). Amostras de abas em segundo plano são descartadas.
2. **Seleção automática protegida:** perfis anteriormente gravados pela medição incorreta da tela são ignorados (nova chave de armazenamento v2). Nunca troca bsnes por Snes9x com base em rAF. A interface aceita futuros contadores reais do core sem inventar valores enquanto esses dados não existirem. A opção manual permanece manual.
3. **Proteção mobile limitada ao que é verificável:** se o pós-processador opcional estiver ativo e houver atrasos persistentes na tela, ele é desligado; não há troca oculta de emulador por esse motivo.
4. **Pós-processamento WebGL2:** desligado por padrão; pode ser ativado nas preferências. Limita uploads a 50 ou 60 por segundo, evita realocar memória de textura a cada frame, limita leituras de preferências, pausa uploads em abas ocultas e libera shader, buffer, textura e canvas ao sair ou perder contexto.
5. **Áudio:** removida a varredura de objetos globais da janela a cada gesto do usuário. O desbloqueio por gesto verifica apenas alguns contextos plausíveis do runtime quando expostos. O diagnóstico informa que não há ajuste de buffer do core confirmado pela interface.
6. **Baixo custo de capacidade:** detecta WebGL e recursos do browser uma única vez, sem criar contextos de áudio em cada consulta.
7. **Cache e diagnóstico:** novo identificador `v1.5.0-etapa3` e relatórios diferenciando medições de tela e dados do core.

## Testes executados

`bash tests/smoke.sh`: análise sintática de todo JavaScript, manifestos e referências; três ROMs de regressão (Doom/Super FX, Final Fight/LoROM, Final Fight 3/HiROM); ZIP/CRC/SMC; cadências de 50, 60, 90, 120 e 144 Hz; detecção de atrasos; pausa quando aba oculta; limpeza de sessão; rejeição de métricas não provenientes de um core; proteção contra fallback falso. Todos aprovados.

## Limites e próximos testes

- **Não foi possível executar uma partida real neste ambiente**: o navegador de integração rejeitou `http://127.0.0.1` e `file://` com `ERR_BLOCKED_BY_ADMINISTRATOR`. Os binários dos cores EmulatorJS também não estão completos no ZIP, como nas etapas anteriores.
- Não há ainda prova de melhora numérica em jogos reais, benchmarks de consumo energético, nem instrumentos de underrun do DSP. Não afirmar ganho em FPS de jogo sem medições do core.
- Para validar manualmente: instalar runtime conforme `scripts/install-runtime.sh` / `.ps1`, servir a pasta por HTTP; abrir cada jogo, verificar som, estabilidade e capacidade de sair/voltar; alternar WebGL2 opcional e observar diagnóstico; testar browsers desktop/móvel; comparar saves/loads antes/depois.
- Etapa 4 sugerida: instrumentar o core selecionado para FPS real, frames descartados, underruns de áudio e tempos de renderização, sem alterar a semântica de execução do Snes9x/bsnes.

**Observação de distribuição:** os arquivos de ROM comerciais presentes no pacote base foram preservados; verifique a licença/direitos antes de redistribuí-los.
