(()=>{'use strict';const N=window.SNESNova=window.SNESNova||{}, $=s=>document.querySelector(s);N.version='1.5.0';
function numericIdFromHash(hash){const h=(hash||'').replace(/[^0-9A-F]/gi,'');return parseInt((h.slice(0,8)||'1'),16)>>>0}N.numericGameId=numericIdFromHash;
async function leaveLibrary(){try{await N.session?.stop?.('library')}finally{$('#playerView')?.setAttribute('hidden','');$('#launcherView')?.removeAttribute('hidden');const g=$('#game');if(g)g.replaceChildren();}}
document.addEventListener('DOMContentLoaded',()=>{const b=$('#backBtn'),q=$('#qmLibrary');if(b){const clone=b.cloneNode(true);b.replaceWith(clone);clone.addEventListener('click',leaveLibrary)}if(q){q.addEventListener('click',async e=>{e.preventDefault();await leaveLibrary()},{capture:true})}
const label=$('#sessionPerf');window.addEventListener('snesnova:performance',e=>{if(label&&e.detail.metric==='display-cadence')label.textContent=`Tela: ${e.detail.displayHz} Hz • cadência ${e.detail.presentationRate} Hz • pausas ${e.detail.stutter}% (não é FPS do jogo)`;});
});
window.addEventListener('snesnova:savestate',()=>N.logger?.log?.('SAVE','Save state confirmado pelo EmulatorJS'));
window.addEventListener('snesnova:loadstate',()=>N.logger?.log?.('SAVE','Load state confirmado pelo EmulatorJS'));
})();