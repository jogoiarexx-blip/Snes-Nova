(()=>{'use strict';
const N=window.SNESNova=window.SNESNova||{};
const S={state:'idle',title:'',hash:'',core:'',startedAt:0,monitor:null,raf:null,watchdog:null,samples:[],fallbackOffered:false,token:0,stopPromise:null};
const emit=(n,d={})=>window.dispatchEvent(new CustomEvent('snesnova:'+n,{detail:d}));
function cleanGlobals(){Object.keys(window).filter(k=>k.startsWith('EJS_')).forEach(k=>{try{delete window[k]}catch{}})}
function snapshot(){return {state:S.state,title:S.title,hash:S.hash,core:S.core,startedAt:S.startedAt,fallbackOffered:S.fallbackOffered,token:S.token}}
function begin(meta){
  if(S.state!=='idle'||S.stopPromise)throw new Error('Sessão anterior ainda ativa');
  stopMonitor();clearTimeout(S.watchdog);window.__SNESNovaLastEmulationPerf=null;S.token++;
  Object.assign(S,{state:'starting',title:meta.title||'',hash:meta.hash||'',core:meta.core||'',startedAt:0,samples:[],fallbackOffered:false});
  const token=S.token;
  S.watchdog=setTimeout(()=>{if(S.state==='starting'&&token===S.token)emit('coretimeout',{...snapshot(),reason:'start-timeout'})},30000);
  emit('sessionprepare',snapshot());
}
function started(){
  if(S.state!=='starting')return;
  clearTimeout(S.watchdog);S.watchdog=null;S.state='running';S.startedAt=Date.now();
  startMonitor();emit('sessionstart',snapshot());
}
function startMonitor(){
  stopMonitor();let last=null;
  function tick(t){
    if(S.state!=='running')return;
    if(!document.hidden&&last!==null){const delta=t-last;if(delta>=2&&delta<250){S.samples.push(delta);if(S.samples.length>900)S.samples.shift()}}
    last=document.hidden?null:t;
    S.raf=requestAnimationFrame(tick);
  }
  S.raf=requestAnimationFrame(tick);
  // These browser frame callbacks measure screen scheduling, not SNES emulation speed.
  S.monitor=setInterval(()=>{
    if(S.state!=='running'||document.hidden)return;
    const fn=window.SNESNovaPerformanceMetrics?.summarize;
    const data=fn?.(S.samples.slice(-600));
    if(!data)return;
    const result={...data,core:S.core,hash:S.hash};
    window.__SNESNovaLastPerf=result;
    emit('performance',result);
  },3000);
}
function visibilityChanged(){S.samples.length=0;}
document.addEventListener('visibilitychange',visibilityChanged);
function stopMonitor(){
  if(S.monitor!==null)clearInterval(S.monitor);
  if(S.raf!==null)cancelAnimationFrame(S.raf);
  S.monitor=S.raf=null;S.samples=[];
}
async function requestExit(){
  const e=window.EJS_emulator;
  try{
    if(e){for(const name of ['exit','terminate','destroy','stop'])if(typeof e[name]==='function'){
      await Promise.resolve(e[name]());return true;
    }}
    if(typeof window.EJS_terminate==='function'){await Promise.resolve(window.EJS_terminate());return true}
  }catch(err){console.warn('SNES Nova teardown:',err)}return false;
}
function stop(reason='library'){
  if(S.stopPromise)return S.stopPromise;
  if(S.state==='idle')return Promise.resolve();
  clearTimeout(S.watchdog);S.watchdog=null;
  const duration=S.startedAt?Date.now()-S.startedAt:0;
  stopMonitor();S.state='stopping';
  const promise=(async()=>{
    let exited=false;try{exited=await requestExit()}catch(err){console.warn('SNES Nova exit failed',err)}
    const end={duration,reason,hash:S.hash,core:S.core,exited};
    S.token++;S.state='idle';window.__SNESNovaLastPerf=null;window.__SNESNovaLastEmulationPerf=null;emit('sessionend',end);
    return end;
  })();
  S.stopPromise=promise;
  void promise.finally(()=>{if(S.stopPromise===promise)S.stopPromise=null}).catch(()=>{});
  return promise;
}
// Future instrumented cores may emit exact emulated frame counts. Never infer these from rAF.
window.addEventListener('snesnova:emulationmetrics',e=>{
  if(S.state!=='running')return;
  const detail=e.detail||{};
  if(detail.core!==S.core||detail.hash!==S.hash)return;
  const sample=window.SNESNovaPerformanceMetrics?.emulationSample(detail);
  if(sample){window.__SNESNovaLastEmulationPerf=sample;emit('coreperformance',sample)}
});
N.session={begin,started,stop,snapshot,cleanGlobals,requestExit};
})();
