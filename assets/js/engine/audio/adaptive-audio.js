(()=>{'use strict';
const N=window.SNESNova=window.SNESNova||{};
let last={profile:'auto',state:'idle',bufferControl:'not-exposed',contextState:'unknown',at:null};
function profile(){try{return JSON.parse(localStorage.getItem('snes-nova:enhancements:v1')||'{}').audioProfile||'auto'}catch{return 'auto'}}
function contexts(){
  // Do not enumerate window globals; only inspect plausible EmulatorJS fields without changing internals.
  const e=window.EJS_emulator;
  return [e?.audioContext,e?.Module?.SDL2?.audioContext,e?.Module?.AL?.context].filter((x,i,a)=>
    x&&typeof x.resume==='function'&&typeof x.state==='string'&&a.indexOf(x)===i);
}
async function resumeContexts(){
  const found=contexts();let resumed=0;
  for(const ctx of found){
    try{if(ctx.state==='suspended'){await ctx.resume();resumed++}}catch{}
  }
  last={...last,profile:profile(),state:found.length?'context-found':'context-not-exposed',
    contextState:found.map(c=>c.state).join(',')||'unknown',resumed,bufferControl:'not-exposed',at:Date.now()};
  window.dispatchEvent(new CustomEvent('snesnova:audioengine',{detail:{...last}}));
  return last;
}
// Browser autoplay restrictions may suspend audio until a user gesture.
['pointerdown','keydown','touchstart'].forEach(type=>addEventListener(type,()=>{void resumeContexts()}, {passive:true}));
window.addEventListener('snesnova:sessionstart',()=>{last={profile:profile(),state:'waiting-for-audio',contextState:'unknown',bufferControl:'not-exposed',at:Date.now()}});
window.addEventListener('snesnova:sessionend',()=>{last={profile:profile(),state:'idle',contextState:'unknown',bufferControl:'not-exposed',at:Date.now()}});
N.audioEngine={profile,getState:()=>({...last}),resumeContexts};
})();
