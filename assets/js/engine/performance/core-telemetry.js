/* SNES Nova: diagnostic bridge. Never equate browser callbacks with emulated frames.
   Frame/underrun callbacks require explicit instrumentation inside the selected core.
   Standard EmulatorJS releases do not provide them via a documented API. */
(function(root,factory){
  'use strict';
  const create=factory();
  if(typeof module==='object'&&module.exports)module.exports={createProbe:create};
  if(root&&root.document){
    const N=root.SNESNova=root.SNESNova||{};
    const probe=create({clock:()=>performance.now(),emit:detail=>root.dispatchEvent(new CustomEvent('snesnova:emulationmetrics',{detail}))});
    N.coreTelemetry=probe;
    root.addEventListener('snesnova:sessionend',()=>probe.end());
    root.document.addEventListener('visibilitychange',()=>probe.visible(!root.document.hidden));
  }
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null),function(){
  'use strict';
  const round=(n,p=2)=>Number(n.toFixed(p));
  const valid=(n)=>Number.isFinite(n)&&n>=0;
  const cap=(a,n)=>{if(a.length>=n)a.shift()};
  function percentile(a,p){if(!a.length)return null;const sorted=[...a].sort((x,y)=>x-y);return round(sorted[Math.ceil((sorted.length-1)*p)]);}
  const regionTarget=(region)=>String(region||'').toUpperCase().startsWith('PAL')?50:60;
  function createProbe({clock,emit}={}){
    if(typeof clock!=='function'||typeof emit!=='function')throw new TypeError('clock e emit obrigatórios');
    let session=null,lastEnded=null;
    function current(){return session;}
    function resetWindow(t){if(!session)return;session.windowStart=t;session.frameCount=0;session.timing=[];session.audioCount=0;session.lastFrameAt=null;}
    function start(info){
      if(session)throw new Error('Finalize a sessão de telemetria anterior');
      if(!info||!Number.isSafeInteger(info.token)||info.token<1||!['snes9x','bsnes'].includes(info.core)||!info.hash)
        throw new Error('Identidade de sessão inválida para telemetria');
      session={token:info.token,core:info.core,hash:info.hash,region:info.region||'indefinida',
        targetHz:regionTarget(info.region),status:'booting',bootAt:clock(),readyAt:null,startedAt:null,
        bootMs:null,readyMs:null,source:'sem instrumentação de core',framesTotal:0,audioTotal:0,
        lastSample:null,visible:true,windowStart:null,frameCount:0,timing:[],audioCount:0,lastFrameAt:null};
      return status();
    }
    function isToken(token){return !!session&&session.token===token;}
    function ready(token){if(!isToken(token)||session.readyAt!==null)return false;session.readyAt=clock();session.readyMs=round(session.readyAt-session.bootAt);return true;}
    function running(token){if(!isToken(token)||session.status!=='booting')return false;
      const t=clock();session.status='running';session.startedAt=t;session.bootMs=round(t-session.bootAt);resetWindow(t);return true;}
    function visible(isVisible){if(!session)return;session.visible=!!isVisible;resetWindow(clock());}
    function frame({token,coreMs,ppuMs,dspMs}={}){
      if(!isToken(token)||session.status!=='running'||!session.visible)return false;
      const t=clock();
      // A long pause invalidates the wall-clock sample, not the emulation counter.
      if(session.lastFrameAt!==null&&(t-session.lastFrameAt>1000||t<session.lastFrameAt))resetWindow(t);
      session.lastFrameAt=t;
      session.source='contador de frames do core instrumentado';
      session.framesTotal++;
      session.frameCount++;
      if([coreMs,ppuMs,dspMs].some(v=>v!==undefined)){
        const timings={};
        for(const [key,v] of Object.entries({coreMs,ppuMs,dspMs}))if(valid(v)&&v<=1000)timings[key]=v;
        if(Object.keys(timings).length){cap(session.timing,512);session.timing.push(timings)}
      }
      const elapsed=t-session.windowStart;
      if(elapsed>=3000&&session.frameCount>=120){
        const detail={source:'core',token:session.token,core:session.core,hash:session.hash,
          targetHz:session.targetHz,elapsedMs:round(elapsed),emulatedFrames:session.frameCount};
        if(session.timing.length){
          for(const field of ['coreMs','ppuMs','dspMs']){
            const vals=session.timing.map(x=>x[field]).filter(valid);
            if(vals.length)detail[field+'P95']=percentile(vals,.95);
          }
        }
        // Only report underruns if a dedicated core hook explicitly supplied counts.
        if(session.audioInstrumented)detail.audioUnderruns=session.audioCount;
        session.lastSample={...detail,at:new Date().toISOString()};
        emit(detail);
        resetWindow(t);
      }
      return true;
    }
    function audioUnderrun({token,count=1}={}){
      if(!isToken(token)||session.status!=='running'||!session.visible||!Number.isSafeInteger(count)||count<1||count>1000)return false;
      session.audioInstrumented=true;session.audioTotal+=count;session.audioCount+=count;
      return true;
    }
    function status(){
      if(!session)return {status:'idle',emulationMeasured:false};
      const s=session;
      return {status:s.status,token:s.token,core:s.core,hash:s.hash,region:s.region,targetHz:s.targetHz,
        readyMs:s.readyMs,bootMs:s.bootMs,framesTotal:s.framesTotal,
        audioUnderruns:s.audioInstrumented?s.audioTotal:null,emulationMeasured:s.framesTotal>0,
        source:s.source,lastSample:s.lastSample?{...s.lastSample}:null};
    }
    function end(){const out=status();if(session)lastEnded={...out,endedAt:new Date().toISOString()};session=null;return out;}
    function lastSession(){return lastEnded?{...lastEnded}:null;}
    return {start,ready,running,visible,frame,audioUnderrun,status,end,lastSession,regionTarget};
  }
  return createProbe;
});
