# SNES Nova v0.9.1

Frontend web/PWA para emulação SNES baseado em EmulatorJS.

## Destaques v0.9.1
- Biblioteca IndexedDB com análise SHA-1/CRC32 e ROMs ZIP extraídas em memória.
- Top 10 de clássicos com associação da ROM do próprio usuário (ROMs comerciais não são distribuídas).
- Doom e Final Fight continuam integrados conforme arquivos fornecidos ao projeto.
- Parser de ROM ampliado: mapper, região, SRAM, checksum, copier header e chips especiais.
- Watchdog de inicialização do core, logs internos e diagnóstico ao vivo/exportável.
- Modo TV com navegação básica por gamepad e controles touch em telas móveis.
- Armazenamento persistente, gerenciador de cache e uso estimado.
- Perfis experimentais bsnes: run-ahead, HD Mode 7 e overclock somente quando o core expuser as opções.
- Service Worker v0.8 com timeout de navegação, caches separados e atualização versionada.
- Snes9x fixado no runtime EmulatorJS 4.2.3 via CDN quando runtime local não existir.

## GitHub Pages
Publique o conteúdo desta pasta na raiz do repositório. GitHub Pages funciona normalmente; threads WASM dependem de COOP/COEP e podem ficar indisponíveis.

## Runtime local
Se desejar independência total de CDN, coloque uma distribuição compatível do EmulatorJS em `vendor/emulatorjs/data/`. O app detecta automaticamente.

## ROMs
Não inclua ROMs comerciais sem autorização. O Top 10 serve como catálogo e permite associar arquivos que o usuário possui legalmente.


## Runtime local / GitHub Pages

A v0.9.1 separa os runtimes para evitar misturar cores incompatíveis:

- Snes9x: EmulatorJS 4.2.3 estável.
- bsnes: runtime EmulatorJS 4.3.0-pre compatível com o core bsnes.

No GitHub, mantenha `.github/workflows/pages.yml` e ative **Settings → Pages → Source: GitHub Actions**. O workflow executa `scripts/install-runtime.sh`, baixa os arquivos oficiais, valida os cores e publica o site com `vendor/emulatorjs/...` local.

No Windows, para preencher o runtime antes de um upload manual:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-runtime.ps1
```

O arquivo `vendor/emulatorjs/runtime-manifest.json` é gerado pelo instalador com tamanho e SHA-256 de cada arquivo baixado.
