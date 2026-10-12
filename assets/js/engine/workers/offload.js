(() => {
  'use strict';
  const N=window.SNESNova=window.SNESNova||{};
  let seq=0;
  function rpc(url,payload){
    return new Promise((resolve,reject)=>{
      const w=new Worker(url),id=++seq;
      const timer=setTimeout(()=>finish(new Error('Worker excedeu 20 segundos')),20000);
      let finished=false;
      function finish(error,data){
        if(finished)return;finished=true;
        clearTimeout(timer);w.terminate();
        error?reject(error):resolve(data);
      }
      w.onmessage=e=>{
        if(e.data?.id!==id)return;
        e.data.ok?finish(null,e.data):finish(new Error(e.data.error||'Falha no Worker'));
      };
      w.onerror=e=>finish(new Error(e.message||'Worker indisponível'));
      w.onmessageerror=()=>finish(new Error('Mensagem do Worker inválida'));
      try{w.postMessage({id,...payload})}catch(error){finish(error)}
    });
  }
  function install(){
    if(typeof Worker==='undefined')return;
    if(N.zipReader&&!N.zipReader.__offloaded){
      const original=N.zipReader.extractRom;
      N.zipReader.extractRom=async(file,index=0)=>{
        try{return (await rpc('assets/js/engine/workers/zip-worker.js',{file,index})).file}
        catch{return original(file,index)}
      };
      N.zipReader.extractFirstRom=(file)=>N.zipReader.extractRom(file,0);
      N.zipReader.__offloaded=true;
    }
    if(N.patches&&!N.patches.__offloaded){
      const original=N.patches.patchFile;
      N.patches.patchFile=async(rom,patch)=>{
        try{
          const result=await rpc('assets/js/engine/workers/patch-worker.js',{rom,patch});
          if(result.meta)result.file.__snesnovaPatch=result.meta;
          return result.file;
        }catch{return original(rom,patch)}
      };
      N.patches.__offloaded=true;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));
  else setTimeout(install,0);
  N.workerOffload={install};
})();
