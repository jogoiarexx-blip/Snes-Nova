'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const perf=require('../assets/js/engine/performance/performance-metrics.js');
function approx(a,b,tol=.5){assert.ok(Math.abs(a-b)<=tol,`${a} expected near ${b}`)}
function testMetrics(){
  for(const hz of [50,60,90,120,144]){
    const out=perf.summarize(Array.from({length:180},()=>1000/hz));
    assert.equal(out.metric,'display-cadence');
    approx(out.displayHz,hz);approx(out.presentationRate,hz);
    assert.equal(out.stutter,0);assert.equal(out.emulationFps,null);
    console.log(`OK monitor ${hz} Hz não é confundido com FPS do jogo`);
  }
  const gaps=perf.summarize([...Array(99).fill(1000/60),50]);
  assert.ok(gaps.stutter>=1);assert.ok(gaps.onePercentLow<30);
  assert.equal(perf.summarize([12,16]),null);
  assert.equal(perf.emulationSample({source:'requestAnimationFrame',emulatedFrames:180,elapsedMs:3000,targetHz:60}),null);
  assert.equal(perf.emulationSample({source:'core',emulatedFrames:180,elapsedMs:3000,targetHz:60}).emulationFps,60);
  console.log('OK travadas e amostras de emulação autenticadas por origem');
}
function makeBrowser(){
  const listeners=new Map(),storage=new Map(),events=[],intervals=new Map(),raf=new Map();let next=0;
  const win={SNESNova:{engine:{deviceKey:()=> 'device-a'}}};
  const doc={hidden:false,addEventListener:(name,cb)=>add('document:'+name,cb)};
  function add(type,fn){const arr=listeners.get(type)||[];arr.push(fn);listeners.set(type,arr)}
  const emit=(type,detail)=>{events.push({type,detail});for(const fn of listeners.get(type)||[])fn({type,detail})};
  win.addEventListener=add;win.dispatchEvent=e=>{emit(e.type,e.detail)};
  const ctx={window:win,document:doc,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    sessionStorage:{getItem:()=>null},CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}},
    performance:{now:()=>0},requestAnimationFrame:cb=>{raf.set(++next,cb);return next},cancelAnimationFrame:id=>raf.delete(id),
    setInterval:cb=>{intervals.set(++next,cb);return next},clearInterval:id=>intervals.delete(id),
    setTimeout:()=>++next,clearTimeout:()=>{},console};
  vm.createContext(ctx);
  const run=file=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx,{filename:file});
  const frame=t=>{const current=[...raf.values()];raf.clear();current.forEach(fn=>fn(t))};
  return {ctx,win,doc,events,emit,run,frame,intervals,storage};
}
async function testSessionAndLearning(){
  const b=makeBrowser();b.win.SNESNovaPerformanceMetrics=perf;
  b.run('assets/js/engine/performance/adaptive-engine.js');
  b.run('assets/js/modules/session-manager.js');
  const ss=b.win.SNESNova.session;
  ss.begin({title:'test',core:'bsnes',hash:'sha1'});ss.started();
  for(let i=0;i<250;i++)b.frame(i*1000/120);
  [...b.intervals.values()].forEach(fn=>fn());
  const display=b.events.find(e=>e.type==='snesnova:performance');
  assert.ok(display);approx(display.detail.displayHz,120);
  assert.ok(!b.events.some(e=>e.type==='snesnova:fallbacksuggested'));
  assert.equal(Object.keys(b.win.SNESNova.adaptiveEngine.get()).length,0);
  assert.equal(b.win.SNESNova.adaptiveEngine.resolveProfile('sha1','device-a','bsnes','high').core,'bsnes');
  b.emit('snesnova:emulationmetrics',{source:'requestAnimationFrame',core:'bsnes',hash:'sha1',emulatedFrames:160,elapsedMs:4000,targetHz:60});
  assert.equal(Object.keys(b.win.SNESNova.adaptiveEngine.get()).length,0);
  b.emit('snesnova:emulationmetrics',{source:'core',core:'bsnes',hash:'sha1',emulatedFrames:160,elapsedMs:4000,targetHz:60});
  assert.equal(b.win.SNESNova.adaptiveEngine.resolveProfile('sha1','device-a','bsnes','high').core,'snes9x');
  assert.equal(b.win.__SNESNovaLastEmulationPerf.emulationFps,40);
  b.doc.hidden=true;b.emit('document:visibilitychange');
  for(let i=0;i<100;i++)b.frame(10000+i*1000/60);
  [...b.intervals.values()].forEach(fn=>fn());
  assert.equal(b.events.filter(e=>e.type==='snesnova:performance').length,1);
  await ss.stop();
  assert.equal(ss.snapshot().state,'idle');
  assert.equal(b.win.__SNESNovaLastEmulationPerf,null);
  assert.equal(b.win.__SNESNovaLastPerf,null);
  assert.equal(b.intervals.size,0);
  assert.equal(b.win.SNESNova.adaptiveEngine.resolveProfile('other','device-a','bsnes','high').core,'bsnes');
  console.log('OK sessão, mudança de aba, sem falso fallback e aprendizado real por core');
}
function testNoUnsafeActions(){
 const mobile=fs.readFileSync(path.join(__dirname,'../assets/js/v102.js'),'utf8');
 const audio=fs.readFileSync(path.join(__dirname,'../assets/js/engine/audio/adaptive-audio.js'),'utf8');
 const gpu=fs.readFileSync(path.join(__dirname,'../assets/js/engine/video/gpu-presenter.js'),'utf8');
 const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.ok(!mobile.includes("$('#perfUseSnes9x')?.click()"));
 assert.ok(!audio.includes('Object.values(window)'));
 assert.ok(gpu.includes("if(enabled!=='1')return"));
 assert.ok(index.includes('performance-metrics.js'));
 console.log('OK perfis mobile/áudio/GPU sem mudanças de core por FPS da interface');
}
(async()=>{testMetrics();await testSessionAndLearning();testNoUnsafeActions();console.log('DESEMPENHO: TODOS OS TESTES PASSARAM')})().catch(e=>{console.error(e);process.exitCode=1});
