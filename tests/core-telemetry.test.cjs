'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createProbe}=require('../assets/js/engine/performance/core-telemetry.js');
const metrics=require('../assets/js/engine/performance/performance-metrics.js');
function approx(actual,expected,tolerance=0.5){assert.ok(Math.abs(actual-expected)<tolerance,`${actual} ≠ ${expected}`)}
function testCounters(){
  let now=1000;const events=[];
  const probe=createProbe({clock:()=>now,emit:x=>events.push(x)});
  assert.equal(probe.status().emulationMeasured,false);
  assert.equal(probe.regionTarget('PAL'),50);
  assert.equal(probe.regionTarget('NTSC-J'),60);
  assert.equal(probe.frame({token:8}),false);
  probe.start({token:8,hash:'abc',core:'bsnes',region:'NTSC-U'});
  now+=220;
  assert.equal(probe.ready(9),false);
  assert.equal(probe.ready(8),true);
  approx(probe.status().readyMs,220);
  now+=480;probe.running(8);
  approx(probe.status().bootMs,700);
  assert.equal(probe.audioUnderrun({token:8,count:2}),true);
  for(let i=0;i<240;i++){now+=1000/60;assert.equal(probe.frame({token:8,coreMs:3.1,ppuMs:1.2,dspMs:0.5}),true)}
  assert.ok(events.length>=1);
  const e=events[0],sample=metrics.emulationSample(e);
  assert.ok(sample);
  approx(sample.emulationFps,60);
  assert.equal(sample.audioUnderruns,2);
  assert.equal(sample.targetHz,60);
  assert.equal(sample.coreMsP95,3.1);
  assert.equal(sample.ppuMsP95,1.2);
  assert.equal(sample.dspMsP95,.5);
  assert.equal(probe.frame({token:7}),false);
  assert.equal(probe.audioUnderrun({token:7}),false);
  assert.equal(probe.status().framesTotal,240);
  probe.visible(false);
  assert.equal(probe.frame({token:8}),false);
  probe.visible(true);
  now+=2500;probe.frame({token:8});
  assert.equal(events.length,1);
  const old=probe.end();
  assert.equal(old.bootMs,700);
  assert.equal(probe.status().status,'idle');
  assert.equal(probe.lastSession().audioUnderruns,2);
  assert.equal(probe.frame({token:8}),false);
  console.log('OK inicialização, frames reais simulados, tempos p95, underrun e rejeição de token antigo');
}
function testPAL(){
  let now=0;const events=[],p=createProbe({clock:()=>now,emit:e=>events.push(e)});
  p.start({token:3,hash:'pal-hash',core:'snes9x',region:'PAL'});p.running(3);
  for(let i=0;i<250;i++){now+=20;p.frame({token:3})}
  assert.ok(events.length>0);
  assert.equal(events[0].targetHz,50);
  approx(metrics.emulationSample(events[0]).emulationFps,50);
  assert.ok(!('audioUnderruns' in events[0]));
  assert.ok(!('coreMsP95' in events[0]));
  console.log('OK PAL 50 Hz e áudio/timing permanecem indisponíveis sem hook');
}
function testValidation(){
  const base={source:'core',token:1,core:'bsnes',hash:'abc',emulatedFrames:180,elapsedMs:3000,targetHz:60};
  for(const bad of [{token:0},{token:undefined},{core:'mystery'},{hash:''},{source:'requestAnimationFrame'},
    {emulatedFrames:0},{elapsedMs:0},{targetHz:144}]){
    assert.equal(metrics.emulationSample({...base,...bad}),null,JSON.stringify(bad));
  }
  const a=metrics.emulationSample({...base,coreMsP95:2000,ppuMsP95:2.345,audioUnderruns:-1});
  assert.ok(a);
  assert.equal(a.coreMsP95,undefined);
  assert.equal(a.ppuMsP95,2.35);
  assert.equal(a.audioUnderruns,undefined);
  console.log('OK dados falsos/sem origem/fora de faixa rejeitados');
}
function testBrowserBridge(){
  let now=0;
  const listeners={};
  const events=[];
  const win={document:{hidden:false,addEventListener(name,fn){(listeners['document:'+name]??=[]).push(fn)}},
    SNESNova:{},addEventListener(name,fn){(listeners[name]??=[]).push(fn)},
    dispatchEvent(e){events.push(e);for(const fn of listeners[e.type]||[])fn(e)}};
  const ctx={window:win,document:win.document,performance:{now:()=>now},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail}}};
  vm.createContext(ctx);
  const file=path.join(__dirname,'../assets/js/engine/performance/core-telemetry.js');
  vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
  const t=win.SNESNova.coreTelemetry;
  assert.ok(t);
  t.start({token:4,core:'snes9x',hash:'rom',region:'PAL'});
  now=123;t.ready(4);now=323;t.running(4);
  for(let i=0;i<200;i++){now+=20;t.frame({token:4})}
  assert.ok(events.some(e=>e.type==='snesnova:emulationmetrics'));
  assert.equal(t.status().emulationMeasured,true);
  win.dispatchEvent({type:'snesnova:sessionend',detail:{}});
  assert.equal(t.status().emulationMeasured,false);
  assert.equal(t.lastSession().bootMs,323);
  console.log('OK ponte de eventos no navegador e limpeza ao sair');
}
testCounters();testPAL();testValidation();testBrowserBridge();
console.log('TELEMETRIA ETAPA 4: TODOS OS TESTES PASSARAM');
