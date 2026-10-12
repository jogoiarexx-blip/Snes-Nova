# SNES Nova — Etapa 2: compatibilidade de ROMs

Esta versão continua a Etapa 1. A alteração concentra-se no **preparo de ROMs**, não nos binários internos dos cores Snes9x/bsnes.

## Implementado

- ROMs `.zip` são extraídas e validadas **antes** do boot; o `EJS_gameUrl` recebe o arquivo `.sfc`, `.smc` ou `.fig` extraído, não mais o arquivo ZIP.
- Arquivos `.smc` com cabeçalho adicional de 512 bytes são normalizados **antes** de gerar CRC32/SHA-1, consultar compatibilidade e enviar à emulação.
- Classificação LoROM, HiROM, ExHiROM e coprocessadores ajustada; inclui testes sintéticos para SA-1, S-DD1, SPC7110 e ST018. A indicação do chip é baseada no cabeçalho; não comprova que o core selecionado o emule corretamente.
- ZIP: valida assinaturas, offsets, tamanhos, métodos store/deflate, CRC32 e nomes. Limites: ZIP até 64 MiB, ROM extraída até 32 MiB. ZIPs com mais de uma ROM são recusados, para evitar executar a ROM errada.
- Correções na transferência do buffer ao Worker, na detecção de falhas e na expiração de processamento.
- Atualização do cache de scripts do aplicativo (`v1.5.0-etapa2`) para não usar versões incompatíveis dos módulos.

## Testes

Execute `bash tests/smoke.sh` (requer Node.js 22+ com suporte a `DecompressionStream('deflate-raw')`). Os testes checam SHA-1, CRC32, cabeçalho e mapeamento dos 3 arquivos incluídos, ZIP store/deflate, cabeçalho de 512 bytes, chips sintéticos e rejeição de ZIPs perigosos/corrompidos.

## Ainda pendente

- **Emulação real no navegador:** o pacote não inclui os binários locais completos do EmulatorJS. O carregamento depende dos runtimes instalados via scripts do projeto ou da CDN.
- Diferentes ambientes (desktop/mobile), desempenho efetivo, áudio, FPS, saves e progressão de fases exigem replays/testes instrumentados.
- Arquivos ZIP com múltiplas ROMs: por segurança, separe cada ROM em seu próprio ZIP.
- A compatibilidade com ROM hacks, cabeçalhos incomuns e variantes históricas precisa ser testada com um conjunto maior de ROMs.

**Atenção à distribuição:** confira os direitos de redistribuição das ROMs incluídas antes de publicar este projeto.
