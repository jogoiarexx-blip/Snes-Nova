(() => {
  'use strict';
  const N = window.SNESNova = window.SNESNova || {};
  const MAX_ZIP_BYTES = 64 * 1024 * 1024;
  const MAX_ROM_BYTES = 32 * 1024 * 1024;
  const MAX_ENTRIES = 2048;
  const u16 = (b, o) => b[o] | (b[o + 1] << 8);
  const u32 = (b, o) => (u16(b, o) | (u16(b, o + 2) << 16)) >>> 0;
  const assertRange = (b, start, count, label) => {
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(count) || start < 0 || count < 0 || start + count > b.length) {
      throw new Error(`ZIP inválido: ${label} fora dos limites`);
    }
  };
  const crcTable = Array.from({length:256}, (_,i) => {
    let c=i;
    for(let k=0;k<8;k++) c=(c&1)?0xedb88320^(c>>>1):c>>>1;
    return c>>>0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for(const x of bytes) crc=crcTable[(crc^x)&255]^(crc>>>8);
    return (crc^0xffffffff)>>>0;
  }
  function centralDirectory(b) {
    const start = Math.max(0,b.length-22-65535);
    for(let i=b.length-22;i>=start;i--) {
      if(u32(b,i)!==0x06054b50)continue;
      assertRange(b,i,22,'EOCD');
      if(i+22+u16(b,i+20)!==b.length)continue;
      if(u16(b,i+4)!==0||u16(b,i+6)!==0)throw new Error('ZIP dividido em discos não é suportado');
      const n=u16(b,i+10), dirSize=u32(b,i+12), dirOff=u32(b,i+16);
      if(n===0xffff || dirSize===0xffffffff || dirOff===0xffffffff)throw new Error('ZIP64 não suportado');
      if(n>MAX_ENTRIES)throw new Error('ZIP possui entradas demais');
      assertRange(b,dirOff,dirSize,'diretório central');
      return {n,dirOff,dirSize};
    }
    throw new Error('ZIP inválido: diretório central não encontrado');
  }
  function scan(b) {
    const dir=centralDirectory(b), decoder=new TextDecoder(), matches=[];
    let at=dir.dirOff;
    for(let i=0;i<dir.n;i++) {
      assertRange(b,at,46,'entrada central');
      if(u32(b,at)!==0x02014b50)throw new Error('ZIP inválido: assinatura de entrada central');
      const flags=u16(b,at+8),method=u16(b,at+10),crc=u32(b,at+16),packed=u32(b,at+20),unpacked=u32(b,at+24);
      const nameLen=u16(b,at+28),extraLen=u16(b,at+30),commentLen=u16(b,at+32),localOff=u32(b,at+42);
      assertRange(b,at,46+nameLen+extraLen+commentLen,'nome da entrada');
      const name=decoder.decode(b.subarray(at+46,at+46+nameLen));
      at+=46+nameLen+extraLen+commentLen;
      if(!/\.(sfc|smc|fig)$/i.test(name)||name.startsWith('__MACOSX/')||/(?:^|\/)\._/.test(name))continue;
      if(name.includes('\\')||name.startsWith('/')||name.split('/').some(p=>p==='..'))throw new Error('ZIP contém caminho inseguro');
      if(flags&1)throw new Error('ROM ZIP criptografada não é suportada');
      if((flags&8)!==0 && ![0,8].includes(method))throw new Error('Método ZIP não suportado');
      if(![0,8].includes(method))throw new Error('Método ZIP não suportado: '+method);
      if(!unpacked || unpacked>MAX_ROM_BYTES || packed>MAX_ZIP_BYTES)throw new Error('ROM ZIP excede o limite de 32 MB');
      assertRange(b,localOff,30,'cabeçalho local');
      if(u32(b,localOff)!==0x04034b50)throw new Error('ZIP inválido: cabeçalho local');
      if(u16(b,localOff+8)!==method)throw new Error('ZIP inválido: método divergente');
      const localFlags=u16(b,localOff+6);
      if(Boolean(localFlags&1)!==Boolean(flags&1))throw new Error('ZIP inválido: flags inconsistentes');
      const start=localOff+30+u16(b,localOff+26)+u16(b,localOff+28);
      assertRange(b,start,packed,'dados da ROM');
      if(start+packed>dir.dirOff)throw new Error('ZIP inválido: dados sobrepõem o diretório central');
      matches.push({name,method,crc,packed,unpacked,start});
    }
    if(at!==dir.dirOff+dir.dirSize)throw new Error('ZIP inválido: diretório central inconsistente');
    return matches;
  }
  async function unzipEntry(b, entry) {
    const raw=b.subarray(entry.start,entry.start+entry.packed);
    if(entry.method===0)return raw;
    if(typeof DecompressionStream==='undefined')throw new Error('Navegador sem suporte a ZIP Deflate');
    const reader=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks=[];let total=0;
    try{
      for(;;){
        const {done,value}=await reader.read();
        if(done)break;
        total+=value.length;
        if(total>MAX_ROM_BYTES||total>entry.unpacked)throw new Error('ZIP excedeu o tamanho de ROM informado');
        chunks.push(value);
      }
    }catch(err){await reader.cancel().catch(()=>{});throw err}
    const out=new Uint8Array(total);let off=0;
    for(const chunk of chunks){out.set(chunk,off);off+=chunk.length}
    return out;
  }
  async function entries(file) {
    if(file.size>MAX_ZIP_BYTES)throw new Error('ZIP maior que 64 MB');
    const b=new Uint8Array(await file.arrayBuffer());
    const matches=scan(b);
    if(matches.length===0)throw new Error('ZIP não contém ROM .sfc, .smc ou .fig');
    // Do not silently run the wrong game when a ZIP contains several ROMs.
    if(matches.length>1)throw new Error('ZIP contém várias ROMs: mantenha apenas uma ROM no arquivo');
    const x=matches[0],data=await unzipEntry(b,x);
    if(data.length!==x.unpacked)throw new Error('ZIP corrompido: tamanho extraído divergente');
    if(crc32(data)!==x.crc)throw new Error('ZIP corrompido: CRC32 da ROM não confere');
    return [{name:x.name,data,size:data.length,method:x.method}];
  }
  async function extractRom(file,index=0) {
    const e=await entries(file);
    if(index!==0)throw new Error('Índice de ROM inexistente no ZIP');
    const x=e[0];
    return new File([x.data],x.name.split('/').pop(),{type:'application/octet-stream'});
  }
  N.zipReader={entries,extractRom,extractFirstRom:(file)=>extractRom(file,0),MAX_ROM_BYTES};
})();
