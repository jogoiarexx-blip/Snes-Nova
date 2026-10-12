(() => {
  'use strict';
  const N=window.SNESNova=window.SNESNova||{};
  let db=null,index=null;
  async function load(){
    if(db)return db;
    try{
      const r=await fetch('./data/compatibility.json',{cache:'no-cache'});
      db=r.ok?await r.json():{games:{}};
    }catch{db={games:{}}}
    index={sha1:{},crc32:{}};
    for(const [crc,entry] of Object.entries(db.games||{})){
      index.crc32[crc.toUpperCase()]=entry;
      if(entry.sha1)index.sha1[String(entry.sha1).toUpperCase()]=entry;
    }
    return db;
  }
  async function lookup(info){
    await load();
    const sha=String(info?.sha1||'').toUpperCase(),crc=String(info?.crc32||'').toUpperCase();
    if(sha&&index.sha1[sha])return index.sha1[sha];
    const byCrc=index.crc32[crc]||null;
    // A known SHA-1 mismatch must never be overridden by a coincidental CRC32 match.
    if(byCrc&&sha&&byCrc.sha1&&String(byCrc.sha1).toUpperCase()!==sha)return null;
    return byCrc;
  }
  N.compatibility={load,lookup};
})();
