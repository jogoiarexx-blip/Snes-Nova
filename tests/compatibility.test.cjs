'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const ROOT=path.resolve(__dirname,'..');
class BrowserFile extends Blob {
  constructor(parts,name,opts={}){super(parts,opts);this.name=name;this.lastModified=opts.lastModified||Date.now()}
}
const ctx={Blob,File:BrowserFile,TextDecoder,DecompressionStream,Uint8Array,ArrayBuffer,console,crypto:crypto.webcrypto,fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(ROOT,'data/compatibility.json'),'utf8'))})};
ctx.window=ctx;ctx.globalThis=ctx;
vm.createContext(ctx);
for(const p of ['assets/js/modules/zip-reader.js','assets/js/modules/rom-analyzer.js','assets/js/modules/compatibility.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,p),'utf8'),ctx,{filename:p});
const analyzer=ctx.SNESNova.romAnalyzer;
const zipReader=ctx.SNESNova.zipReader;
function nameFile(data,name){return new BrowserFile([data],name)}
function w16(n){const b=Buffer.alloc(2);b.writeUInt16LE(n);return b}
function w32(n){const b=Buffer.alloc(4);b.writeUInt32LE(n>>>0);return b}
function zip(list){
  let at=0;const locals=[],central=[];
  for(const {name,bytes,deflate=false,wrongCrc=false,reportedSize} of list){
    const nm=Buffer.from(name),src=Buffer.from(bytes);
    const packed=deflate?zlib.deflateRawSync(src):src;
    const crc=parseInt(analyzer.crc32(src),16) ^ (wrongCrc?1:0);
    const local=Buffer.concat([w32(0x04034b50),w16(20),w16(0),w16(deflate?8:0),w16(0),w16(0),w32(crc),w32(packed.length),w32(reportedSize??src.length),w16(nm.length),w16(0),nm,packed]);
    const cent=Buffer.concat([w32(0x02014b50),w16(20),w16(20),w16(0),w16(deflate?8:0),w16(0),w16(0),w32(crc),w32(packed.length),w32(reportedSize??src.length),w16(nm.length),w16(0),w16(0),w16(0),w16(0),w32(0),w32(at),nm]);
    locals.push(local);central.push(cent);at+=local.length;
  }
  const cd=Buffer.concat(central);
  const eocd=Buffer.concat([w32(0x06054b50),w16(0),w16(0),w16(list.length),w16(list.length),w32(cd.length),w32(at),w16(0)]);
  return Buffer.concat([...locals,cd,eocd]);
}
function synthetic(mode,type,headerPos=0x7fc0,length=0x10000){
  const bytes=Buffer.alloc(length,0xff);
  const title=Buffer.from('TEST GAME'.padEnd(21),'ascii');
  title.copy(bytes,headerPos);bytes[headerPos+0x15]=mode;bytes[headerPos+0x16]=type;
  bytes[headerPos+0x17]=10;bytes[headerPos+0x18]=0;bytes[headerPos+0x19]=1;
  bytes.writeUInt16LE(0x1234,headerPos+0x1c);bytes.writeUInt16LE(0xedcb,headerPos+0x1e);
  bytes.writeUInt16LE(0x8000,headerPos+0x3c);
  return bytes;
}
(async()=>{
  const expected={
    'doom-1995.sfc':{title:'DOOM',mapper:'LoROM',chip:'Super FX / GSU',crc:'09E85EA6'},
    'final-fight.sfc':{title:'FINAL FIGHT',mapper:'LoROM',chip:'None',crc:'4CAB21DB'},
    'final-fight-3.sfc':{title:'FINAL FIGHT 3',mapper:'HiROM',chip:'None',crc:'8E6F0065'}
  };
  for(const [name,test] of Object.entries(expected)){
    const raw=fs.readFileSync(path.join(ROOT,'games',name));
    const a=await analyzer.analyzeFile(nameFile(raw,name));
    assert.equal(a.title,test.title);
    assert.equal(a.mapper,test.mapper);
    assert.equal(a.chip,test.chip);
    assert.equal(a.crc32,test.crc);
    assert.equal(a.sha1,crypto.createHash('sha1').update(raw).digest('hex').toUpperCase());
    assert.equal(a.sourceFile.size,raw.length);
    assert.equal(a.checksumPairValid,true);
    assert.equal((await ctx.SNESNova.compatibility.lookup(a))?.title.toUpperCase(),test.title);
    console.log(`OK ${name}: ${a.mapper}, ${a.chip}, ${a.crc32}`);
  }
  assert.equal(await ctx.SNESNova.compatibility.lookup({crc32:'09E85EA6',sha1:'F'.repeat(40)}),null);
  const ff=fs.readFileSync(path.join(ROOT,'games','final-fight.sfc'));
  for(const deflate of [false,true]){
    const f=nameFile(zip([{name:'roms/final-fight.sfc',bytes:ff,deflate}]),'arquivo.zip');
    const a=await analyzer.analyzeFile(f);
    assert.equal(a.sourceFile.name,'final-fight.sfc');
    assert.equal(a.sourceFile.size,ff.length);
    assert.equal(a.fromZip,true);
    assert.equal(a.crc32,expected['final-fight.sfc'].crc);
    assert.equal(Buffer.compare(Buffer.from(await a.sourceFile.arrayBuffer()),ff),0);
    console.log(`OK ZIP ${deflate?'deflate':'store'} -> ROM normalizada`);
  }
  const ffWithCopier=Buffer.concat([Buffer.alloc(512,0),ff]);
  const withCopier=await analyzer.analyzeFile(nameFile(ffWithCopier,'old-dump.smc'));
  assert.equal(withCopier.copierHeader,true);
  assert.equal(withCopier.crc32,expected['final-fight.sfc'].crc);
  assert.equal(withCopier.sourceFile.size,ff.length);
  const packedCopier=await analyzer.analyzeFile(nameFile(zip([{name:'old-dump.smc',bytes:ffWithCopier,deflate:true}]),'copier.zip'));
  assert.equal(packedCopier.sourceFile.size,ff.length);
  assert.equal(packedCopier.crc32,expected['final-fight.sfc'].crc);
  console.log('OK remoção de cabeçalho de 512 bytes (.smc e ZIP)');
  for(const [mode,type,kind,chip] of [[0x23,0x34,'LoROM','SA-1'],[0x32,0x45,'LoROM','S-DD1'],[0x3a,0xf5,'HiROM','SPC7110'],[0x3a,0xf9,'HiROM','SPC7110 + RTC'],[0x20,0xf5,'LoROM','ST018']]){
    const h=(mode&15)===10?0xffc0:0x7fc0;
    const a=await analyzer.analyzeFile(nameFile(synthetic(mode,type,h),'chip.sfc'));
    assert.equal(a.chip,chip);assert.equal(a.mapper,kind);
  }
  console.log('OK SA-1, S-DD1, SPC7110, ST018');
  await assert.rejects(zipReader.extractFirstRom(nameFile(zip([{name:'a.sfc',bytes:ff},{name:'b.sfc',bytes:ff}]),'two.zip')),/várias ROMs/);
  await assert.rejects(zipReader.extractFirstRom(nameFile(zip([{name:'a.sfc',bytes:ff,wrongCrc:true}]),'crc.zip')),/CRC32/);
  await assert.rejects(zipReader.extractFirstRom(nameFile(zip([{name:'../a.sfc',bytes:ff}]),'unsafe.zip')),/inseguro/);
  await assert.rejects(zipReader.extractFirstRom(nameFile(zip([{name:'a.sfc',bytes:ff,reportedSize:33*1024*1024}]),'bomb.zip')),/32 MB/);
  await assert.rejects(analyzer.analyzeFile(nameFile(Buffer.alloc(32768,0),'invalid.sfc')),/Cabeçalho/);
  console.log('OK rejeição de ZIP ambíguo, CRC errado, caminho inseguro, tamanho excessivo e ROM inválida');
  console.log('COMPATIBILIDADE: TODOS OS TESTES PASSARAM');
})().catch(e=>{console.error(e);process.exitCode=1});
