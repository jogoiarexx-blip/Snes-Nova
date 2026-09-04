# SNES Nova v0.6.0

Emulador web de SNES baseado em EmulatorJS/Snes9x/bsnes.

## Novidades v0.6.0
- Biblioteca persistente em IndexedDB: ROM adicionada uma vez e jogável depois sem selecionar novamente.
- Identificação de ROM por CRC32 e SHA-1.
- Favoritos, busca, ordenação, detalhes, tempo jogado e sessões.
- Diagnóstico de chip conhecido (Super FX/SA-1/CX4/DSP por base de compatibilidade) e perfis por jogo.
- Monitor de estabilidade da sessão e recomendação de fallback bsnes -> Snes9x.
- Menu rápido próprio (F1) com quick save/load, fullscreen, configurações e biblioteca.
- Modo TV com controles maiores e atalho Start+Select para abrir o menu.
- Painel P1/P2 com detecção de múltiplos gamepads.
- Save Manager com quick save/load e backup dos dados do app.
- Brilho, contraste, saturação e intensidade de scanlines ajustáveis em tempo real.
- Aviso de atualização do PWA e cache versionado.
- Doom e Final Fight continuam integrados.

## GitHub Pages
Extraia o conteúdo desta pasta na raiz do repositório e habilite Settings > Pages > Deploy from branch. WebGL/PWA funcionam normalmente. Threads WASM dependem de COOP/COEP e geralmente ficam indisponíveis no GitHub Pages; o app faz fallback automático.

## Runtime
O projeto tenta `vendor/emulatorjs/data/` primeiro. Se não existir, usa a CDN do EmulatorJS. Para funcionamento 100% offline, copie a distribuição completa do EmulatorJS para essa pasta.

ROMs comerciais de terceiros devem ser usadas apenas quando o usuário tiver direito de utilizá-las.
