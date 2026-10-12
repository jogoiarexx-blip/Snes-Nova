(() => {
  'use strict';
  const N=window.SNESNova=window.SNESNova||{};
  let worker=null,seq=0;
  const pending=new Map();
  function failAll(error){
    for(const [id,p] of pending){clearTimeout(p.timer);p.reject(error);pending.delete(id)}
    if(worker){worker.terminate();worker=null}
  }
  function getWorker(){
    if(worker)return worker;
    worker=new Worker('assets/js/engine/workers/rom-worker.js');
    worker.onmessage=({data})=>{
      const p=pending.get(data?.id);if(!p)return;
      pending.delete(data.id);clearTimeout(p.timer);
      data.ok?p.resolve(data.result):p.reject(new Error(data.error||'Falha no hash da ROM'));
    };
    worker.onerror=()=>failAll(new Error('Worker de hash interrompido'));
    worker.onmessageerror=()=>failAll(new Error('Resposta inválida do Worker'));
    return worker;
  }
  function hash(buffer){
    if(!(buffer instanceof ArrayBuffer))return Promise.reject(new TypeError('Hash exige ArrayBuffer'));
    if(typeof Worker==='undefined')return Promise.reject(new Error('Worker não disponível'));
    return new Promise((resolve,reject)=>{
      const id=++seq;
      const timer=setTimeout(()=>failAll(new Error('Tempo excedido no Worker de ROM')),20000);
      pending.set(id,{resolve,reject,timer});
      try{
        // Transfer a single copied buffer, not the original ROM required by the player.
        const copy=buffer.slice(0);
        getWorker().postMessage({id,op:'hash',buffer:copy},[copy]);
      }catch(err){
        clearTimeout(timer);pending.delete(id);reject(err);
        failAll(new Error('Worker de ROM indisponível'));
      }
    });
  }
  N.workerManager={hash,supported:()=>typeof Worker!=='undefined'};
})();
