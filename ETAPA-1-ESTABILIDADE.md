# SNES Nova — etapa 1 (estabilidade do ciclo de vida)

Alterações:
- Serialização do encerramento da sessão, prevenindo tentativas simultâneas de finalizar o core.
- Bloqueio de abertura concorrente de ROMs durante inicialização e fechamento.
- Confirmação assíncrona do encerramento antes de retirar o player e liberar a URL da ROM.
- Correção do evento de retorno à biblioteca para não passar o objeto Event como motivo.
- Remoção de callback `EJS_onExit` duplicado.
- Tratamento de erro síncrono/assíncrono na preparação do jogo.
- Tratamento do erro de download do loader com retorno à biblioteca.

Verificações: `bash tests/smoke.sh`, `node --check assets/js/app.js` e `node --check assets/js/modules/session-manager.js`.

Limites: não foram executados jogos em navegador nesta etapa; não houve atualização dos binários dos cores. O encerramento efetivo ainda depende de métodos disponíveis na versão concreta do EmulatorJS. Caso o core não suporte encerramento, poderá ser necessário recarregar a página para isolamento total. Salvamento de estado e fluxo offline permanecem para etapas posteriores.
