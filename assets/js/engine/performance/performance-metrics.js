/* Independent browser presentation metrics. This is NOT the emulated game's FPS. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SNESNovaPerformanceMetrics=api;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null),function(){
  'use strict';
  const round=(n,dec=1)=>Number(n.toFixed(dec));
  function summarize(intervals){
    const a=intervals.filter(ms=>Number.isFinite(ms)&&ms>=2&&ms<250);
    if(a.length<30)return null;
    const sorted=[...a].sort((x,y)=>x-y);
    const median=sorted[Math.floor(sorted.length/2)];
    // Long display gaps are relative to the actual monitor cadence (including 90/120/144 Hz).
    const avg=a.reduce((s,n)=>s+n,0)/a.length;
    const worst=sorted.slice(-Math.max(1,Math.ceil(sorted.length*.01)));
    const worstAvg=worst.reduce((s,n)=>s+n,0)/worst.length;
    const stalls=a.filter(n=>n>median*1.5+1).length;
    return Object.freeze({
      metric:'display-cadence',
      sampleCount:a.length,
      displayHz:round(1000/median),
      presentationRate:round(1000/avg),
      onePercentLow:round(1000/worstAvg),
      stutter:round(stalls*100/a.length),
      frameTime:round(avg,2),
      p99:round(sorted[Math.max(0,Math.ceil(sorted.length*.99)-1)],2),
      source:'requestAnimationFrame',
      emulationFps:null,
      emulationMeasured:false
    });
  }
  // Only frame counters taken directly from an instrumented emulation core are eligible.
  function emulationSample(x){
    if(!x||x.source!=='core'||!Number.isInteger(x.emulatedFrames)||x.emulatedFrames<120||
       !Number.isFinite(x.elapsedMs)||x.elapsedMs<1000||x.elapsedMs>120000||
       !Number.isFinite(x.targetHz)||![50,60].includes(x.targetHz))return null;
    if(!Number.isSafeInteger(x.token)||x.token<1||!['snes9x','bsnes'].includes(x.core)||typeof x.hash!=='string'||!x.hash)return null;
    const emulationFps=1000*x.emulatedFrames/x.elapsedMs;
    if(emulationFps>250)return null;
    const out={metric:'emulation',source:'core',emulationMeasured:true,
      emulationFps:round(emulationFps),targetHz:x.targetHz,core:x.core||'',hash:x.hash||'',
      elapsedMs:x.elapsedMs,emulatedFrames:x.emulatedFrames,token:x.token};
    for(const field of ['coreMsP95','ppuMsP95','dspMsP95'])if(Number.isFinite(x[field])&&x[field]>=0&&x[field]<=1000)out[field]=round(x[field],2);
    if(Number.isSafeInteger(x.audioUnderruns)&&x.audioUnderruns>=0)out.audioUnderruns=x.audioUnderruns;
    return out;
  }
  return {summarize,emulationSample};
});
