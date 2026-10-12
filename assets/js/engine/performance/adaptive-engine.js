(()=>{'use strict';
const N=window.SNESNova=window.SNESNova||{};
// v1 was trained on requestAnimationFrame timing and must not control the core choice.
const KEY='snes-nova:adaptive-engine:v2';
function all(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
function save(a){try{localStorage.setItem(KEY,JSON.stringify(a))}catch{}}
const k=(hash,device)=>`${hash||'unknown'}@${device||'generic'}`;
function resolveProfile(hash,device,requested,tier){
  const p=all()[k(hash,device)]||{};
  const trusted=p.lastSample?.metric==='emulation'&&p.lastSample?.emulationMeasured===true;
  let core=trusted?p.core||requested:requested;
  if(tier==='low'&&core==='bsnes')core='snes9x';
  return {...(trusted?p:{}),core,tier,telemetry:trusted?'core-measured':'unavailable'};
}
function learn(hash,device,sample){
  if(!hash||!device||sample?.metric!=='emulation'||sample.emulationMeasured!==true||sample.source!=='core')return false;
  if(!['snes9x','bsnes'].includes(sample.core)||sample.hash!==hash||sample.emulatedFrames<120||
     ![50,60].includes(sample.targetHz)||!Number.isFinite(sample.emulationFps))return false;
  const a=all(),key=k(hash,device),old=a[key]||{};
  let core=sample.core;
  // Degrade bsnes only if core-measured speed stays below 90% of its regional target.
  if(core==='bsnes'&&sample.emulationFps<sample.targetHz*.9)core='snes9x';
  a[key]={...old,core,lastSample:sample,updatedAt:Date.now()};save(a);return true;
}
window.addEventListener('snesnova:coreperformance',e=>{
  const hash=N.session?.snapshot?.().hash,device=N.engine?.deviceKey?.();
  if(hash&&device)learn(hash,device,e.detail);
});
N.adaptiveEngine={resolveProfile,learn,get:all};
})();
