# SNES Nova v0.5.0

Emulador web de Super Nintendo com biblioteca integrada e seleção inteligente entre Snes9x e bsnes.

## Novidades v0.5.0

- Benchmark real do navegador salvo localmente.
- Perfis aprendidos por jogo: core, perfil gráfico, proporção, filtro e overscan.
- Seleção automática Snes9x/bsnes combinando ROM + hardware + benchmark + perfil aprendido.
- Snes9x usa o canal estável do EmulatorJS; bsnes usa o canal nightly quando o runtime local não está instalado, pois é onde o core está disponível atualmente no CDN público.
- Detecção automática de runtime local em `vendor/emulatorjs/data/`.
- Proporções 4:3, 8:7 e esticada.
- Recorte opcional de overscan.
- Filtros Pixel, CRT, Suavizado e Vivo.
- WebGL2 preferido e fallback WebGL1.
- Threads WASM apenas quando `crossOriginIsolated`/SharedArrayBuffer estão realmente disponíveis.
- Cache do EmulatorJS habilitado e PWA atualizado.
- Doom e Final Fight continuam integrados.

## Runtime local

O aplicativo procura primeiro por:

`vendor/emulatorjs/data/loader.js`

Se essa pasta existir com uma distribuição compatível do EmulatorJS, usa os arquivos locais. Caso contrário, usa CDN + cache do navegador.

Para um pacote 100% offline, copie uma distribuição oficial completa do diretório `data/` do EmulatorJS para `vendor/emulatorjs/data/`, incluindo os cores desejados.

## Threads WASM

Threads exigem os headers HTTP:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

Sem eles o SNES Nova desativa threads automaticamente e continua funcionando.

## Execução

Use HTTP/HTTPS. Não abra por `file://`.

Exemplo local:

`python -m http.server 8080`

Depois abra `http://localhost:8080`.
