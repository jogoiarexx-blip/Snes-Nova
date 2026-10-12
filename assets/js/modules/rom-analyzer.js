(() => {
  'use strict';
  const N = window.SNESNova = window.SNESNova || {};
  const MAX_ROM_BYTES=32*1024*1024;
  const table=Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
  function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return((c^0xffffffff)>>>0).toString(16).toUpperCase().padStart(8,'0')}
  async function sha1(bytes){if(!globalThis.crypto?.subtle)return '';const d=await crypto.subtle.digest('SHA-1',bytes);return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('').toUpperCase()}
  function title(bytes,o){return String.fromCharCode(...bytes.subarray(o,o+21)).replace(/[\x00-\x1f\x7f-\xff]/g,' ').trim()}
  function kind(mode,o,size){const m=mode&0x0f;if(m===5&&(o===0x40ffc0||size>0x400000))return 'ExHiROM';if(m===1||m===5||m===10)return 'HiROM';return 'LoROM'}
  function candidate(bytes,o){
    if(o+64>bytes.length)return null;
    const mode=bytes[o+0x15], type=bytes[o+0x16], romExp=bytes[o+0x17], ramExp=bytes[o+0x18], country=bytes[o+0x19];
    const sum=bytes[o+0x1e]|bytes[o+0x1f]<<8,comp=bytes[o+0x1c]|bytes[o+0x1d]<<8;
    const pair=((sum^comp)&65535)===65535 && sum!==0 && comp!==0;
    const raw=bytes.subarray(o,o+21), printable=raw.filter(b=>b>=0x20&&b<=0x7e).length;
    const reset=bytes[o+0x3c]|bytes[o+0x3d]<<8;
    const map=kind(mode,o,bytes.length), mappingMatch=(o===0x7fc0&&map==='LoROM')||(o===0xffc0&&map==='HiROM')||(o===0x40ffc0&&map==='ExHiROM');
    let score=0;
    if(pair)score+=12;
    if(mappingMatch)score+=8;else score-=8;
    if(printable>=18)score+=5;else if(printable>=13)score+=2;else score-=6;
    if([0x20,0x21,0x22,0x23,0x25,0x30,0x31,0x32,0x33,0x35].includes(mode))score+=3;
    else score-=3;
    if(reset>=0x8000)score+=5;else score-=7;
    if(romExp>=7&&romExp<=16)score+=2;
    if(ramExp<=9)score+=1;
    if(country<=13)score+=1;
    if(o===0x40ffc0&&bytes.length<=0x400000)score-=20;
    return {o,score,pair,mode,type,romExp,ramExp,country,map,reset,title:title(bytes,o)};
  }
  function region(v){
    if(v===0)return 'NTSC-J';
    if(v===1||v===13)return 'NTSC-U';
    if(v>=2&&v<=12)return 'PAL';
    return `Região ${v}`;
  }
  function chip(type,mode){
    const m=mode&0x0f;
    if([0x13,0x14,0x15,0x1a].includes(type))return 'Super FX / GSU';
    if(m===3&&[0x34,0x35].includes(type))return 'SA-1';
    if([0x43,0x45].includes(type))return 'S-DD1';
    if(type===0xf3)return 'CX4';
    if(m===10&&[0xf5,0xf9].includes(type))return type===0xf9?'SPC7110 + RTC':'SPC7110';
    if(type===0xf5)return 'ST018';
    if(type===0xf6)return 'ST010/ST011';
    if(type===0x25)return 'OBC-1';
    if(type===0x55)return 'S-RTC';
    if([0x03,0x05].includes(type))return 'DSP';
    return 'None';
  }
  function checksum16(bytes){let c=0;for(const b of bytes)c=(c+b)&65535;return c}
  async function analyzeFile(file){
    if(!file||!/\.(sfc|smc|fig|zip)$/i.test(file.name))throw new Error('Arquivo de ROM inválido');
    if(file.size>MAX_ROM_BYTES&& !/\.zip$/i.test(file.name))throw new Error('ROM maior que 32 MB');
    const isZip=/\.zip$/i.test(file.name);
    let source=isZip?await N.zipReader.extractFirstRom(file):file;
    let bytes=new Uint8Array(await source.arrayBuffer());
    let copierHeader=false;
    if(bytes.length%0x8000===512){bytes=bytes.subarray(512);copierHeader=true}
    if(bytes.length<0x8000||bytes.length>MAX_ROM_BYTES)throw new Error('Tamanho de ROM SNES inválido');
    const candidates=[0x7fc0,0xffc0,0x40ffc0].map(o=>candidate(bytes,o)).filter(Boolean).sort((a,b)=>b.score-a.score);
    const h=candidates[0];
    if(!h||h.score<8)throw new Error('Cabeçalho SNES não reconhecido; verifique a ROM');
    // The emulation bytes must match the bytes that were analyzed and fingerprinted.
    if(copierHeader)source=new File([bytes],source.name,{type:'application/octet-stream'});
    const wh=N.workerManager?.supported?.() ? await N.workerManager.hash(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)).catch(()=>null):null;
    return {bytes,sourceFile:source,originalFileName:file.name,fromZip:isZip,
      crc32:wh?.crc32||crc32(bytes),sha1:wh?.sha1||await sha1(bytes),sha256:wh?.sha256||'',
      title:h.title||source.name.replace(/\.[^.]+$/,''),headerOffset:h.o,headerScore:h.score,
      mapper:h.map,mapMode:'0x'+h.mode.toString(16).toUpperCase().padStart(2,'0'),
      cartridgeType:'0x'+h.type.toString(16).toUpperCase().padStart(2,'0'),chip:chip(h.type,h.mode),region:region(h.country),
      romSize:h.romExp<=20?2**h.romExp*1024:bytes.length,
      sramSize:h.ramExp>0&&h.ramExp<=20?2**h.ramExp*1024:0,
      copierHeader,checksum:h.pair?(bytes[h.o+0x1e]|bytes[h.o+0x1f]<<8).toString(16).toUpperCase().padStart(4,'0'):'',
      checksumPairValid:h.pair,calculatedChecksum:checksum16(bytes).toString(16).toUpperCase().padStart(4,'0'),
      suspicious:!h.pair||h.score<20};
  }
  N.romAnalyzer={analyzeFile,crc32,sha1,chip};
})();
