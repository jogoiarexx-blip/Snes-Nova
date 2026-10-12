(()=>{'use strict';const N=window.SNESNova=window.SNESNova||{}, $=s=>document.querySelector(s);N.version='1.5.0';
function numericIdFromHash(hash){const h=(hash||'').replace(/[^0-9A-F]/gi,'');return parseInt((h.slice(0,8)||'1'),16)>>>0}N.numericGameId=numericIdFromHash;
async function leaveLibrary(){try{await N.session?.stop?.('library')}finally{$('#playerView')?.setAttribute('hidden','');$('#launcherView')?.removeAttribute('hidden');const g=$('#game');if(g)g.replaceChildren();}}
document.addEventListener('DOMContentLoaded',()=>{const b=$('#backBtn'),q=$('#qmLibrary');if(b){const clone=b.cloneNode(true);b.replaceWith(clone);clone.addEventListener('click',leaveLibrary)}if(q){q.addEventListener('click',async e=>{e.preventDefault();await leaveLibrary()},{capture:true})}
const label=$('#sessionPerf');let display=null,emulation=null;
function renderPerf(){if(!label)return;const screenInfo=display?`Tela: ${display.displayHz} Hz • cadência ${display.presentationRate} Hz • pausas ${display.stutter}%`:'Tela: ainda sem amostras';const coreInfo=emulation?`Core medido: ${emulation.emulationFps}/${emulation.targetHz} FPS`:'FPS do jogo indisponível (core não instrumentado)';label.textContent=screenInfo+' | '+coreInfo;}
window.addEventListener('snesnova:performance',e=>{if(e.detail.metric==='display-cadence'){display=e.detail;renderPerf()}});
window.addEventListener('snesnova:coreperformance',e=>{emulation=e.detail;renderPerf()});
window.addEventListener('snesnova:sessionprepare',()=>{display=null;emulation=null;renderPerf()});
});
window.addEventListener('snesnova:savestate',()=>N.logger?.log?.('SAVE','Save state confirmado pelo EmulatorJS'));
window.addEventListener('snesnova:loadstate',()=>N.logger?.log?.('SAVE','Load state confirmado pelo EmulatorJS'));
})();