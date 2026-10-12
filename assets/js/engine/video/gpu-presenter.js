(()=>{'use strict';
const N=window.SNESNova=window.SNESNova||{};
let state=null,pendingStart=null;
const VS=`#version 300 es\nin vec2 p;out vec2 uv;void main(){uv=(p+1.0)*0.5;uv.y=1.0-uv.y;gl_Position=vec4(p,0.,1.);}`;
const FS=`#version 300 es\nprecision mediump float;in vec2 uv;out vec4 o;uniform sampler2D tex;uniform float brightness,contrast,saturation,gammaV,scan;uniform vec2 sourceSize;void main(){vec4 c=texture(tex,uv);vec3 x=c.rgb;x=(x-.5)*contrast+.5;x*=brightness;float l=dot(x,vec3(.2126,.7152,.0722));x=mix(vec3(l),x,saturation);x=pow(max(x,vec3(0.)),vec3(1./max(.01,gammaV)));if(scan>0.){float line=.5+.5*cos(3.14159265*uv.y*sourceSize.y);x*=mix(1.,.72+.28*line,scan);}o=vec4(clamp(x,0.,1.),c.a);}`;
function shader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const reason=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(reason||'shader')}return s}
function program(gl){const v=shader(gl,gl.VERTEX_SHADER,VS),f=shader(gl,gl.FRAGMENT_SHADER,FS),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.detachShader(p,v);gl.detachShader(p,f);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const reason=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw Error(reason||'link')}return p}
function prefs(){let c={b:1,c:1,s:1,scan:0};try{Object.assign(c,JSON.parse(localStorage.getItem('snes-nova:color')||'{}'))}catch{};
  const num=(value,fallback,min,max)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
  return {brightness:num(c.b,1,.4,2),contrast:num(c.c,1,.4,2),saturation:num(c.s,1,0,2),scan:num(c.scan,0,0,1),gammaV:1};
}
function stop(){
  if(pendingStart!==null){clearTimeout(pendingStart);pendingStart=null}
  if(!state)return;
  const s=state;state=null;
  cancelAnimationFrame(s.raf);
  s.out.removeEventListener('webglcontextlost',s.onLost);
  s.source.classList.remove('sn-engine-source-canvas');s.out.remove();
  try{if(!s.lost){s.gl.deleteTexture(s.texture);s.gl.deleteBuffer(s.buffer);s.gl.deleteProgram(s.program)}}catch{}
  window.dispatchEvent(new CustomEvent('snesnova:gpupresenter',{detail:{active:false}}));
}
function start(){
  if(pendingStart!==null){clearTimeout(pendingStart);pendingStart=null}
  if(state)return true;
  if(document.hidden||N.session?.snapshot?.().state!=='running')return false;
  const source=document.querySelector('#game canvas'),caps=N.engine?.caps?.();
  if(!source||!source.parentElement||!caps?.webgl2||N.engine?.tier?.()==='low')return false;
  const out=document.createElement('canvas');out.className='sn-engine-gpu-output';out.setAttribute('aria-hidden','true');
  source.parentElement.appendChild(out);
  const gl=out.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
  if(!gl){out.remove();return false}
  let pr,buffer,texture;
  try{
    pr=program(gl);gl.useProgram(pr);
    buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const u={};for(const name of ['brightness','contrast','saturation','gammaV','scan','sourceSize'])u[name]=gl.getUniformLocation(pr,name);
    gl.uniform1i(gl.getUniformLocation(pr,'tex'),0);
    const onLost=e=>{e.preventDefault();if(state)state.lost=true;stop()};
    const s={source,out,gl,texture,buffer,program:pr,raf:null,lost:false,onLost,
      width:0,height:0,lastDraw:0,lastPrefs:0,params:prefs(),frames:0,startedAt:performance.now()};
    state=s;out.addEventListener('webglcontextlost',onLost);
    // Secondary canvas is explicitly opt-in. Cap uploads to the game's video standard.
    const hz=/PAL/i.test(window.__SNESNovaRomRegion||'')?50:60;
    function frame(now){
      if(state!==s)return;
      if(!document.body.contains(source)||!document.body.contains(out)||N.session?.snapshot?.().state!=='running'){stop();return}
      s.raf=requestAnimationFrame(frame);
      if(document.hidden)return;
      if(now-s.lastDraw<(1000/hz-2))return;
      const w=source.width||256,h=source.height||224;
      try{
        if(out.width!==w||out.height!==h){
          out.width=w;out.height=h;gl.viewport(0,0,w,h);
          gl.bindTexture(gl.TEXTURE_2D,texture);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
          s.width=w;s.height=h;
        }
        if(now-s.lastPrefs>160){s.params=prefs();s.lastPrefs=now}
        const p=s.params;
        gl.uniform1f(u.brightness,p.brightness);gl.uniform1f(u.contrast,p.contrast);gl.uniform1f(u.saturation,p.saturation);
        gl.uniform1f(u.gammaV,p.gammaV);gl.uniform1f(u.scan,p.scan);gl.uniform2f(u.sourceSize,w,h);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
        gl.drawArrays(gl.TRIANGLES,0,6);
        if(s.frames===0)source.classList.add('sn-engine-source-canvas');
        s.frames++;s.lastDraw=now;
      }catch(e){console.warn('SNES Nova GPU presenter stopped:',e.message);stop()}
    }
    // Leave the core's own canvas visible until the first successful uploaded frame.
    s.raf=requestAnimationFrame(frame);
    window.dispatchEvent(new CustomEvent('snesnova:gpupresenter',{detail:{active:true,hz,extraCanvas:true}}));
    return true;
  }catch(e){
    try{if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(pr)gl.deleteProgram(pr)}catch{}
    out.remove();return false;
  }
}
function scheduleStart(){
  if(pendingStart!==null)clearTimeout(pendingStart);
  // Default OFF: copying WebGL/canvas frames into another GPU texture can increase load.
  const enabled=localStorage.getItem('snes-nova:gpu-presenter');
  if(enabled!=='1')return;
  pendingStart=setTimeout(()=>{pendingStart=null;start()},700);
}
window.addEventListener('snesnova:sessionstart',scheduleStart);
window.addEventListener('snesnova:sessionend',stop);
N.gpuPresenter={start,stop,active:()=>!!state,getState:()=>state?{active:true,extraCanvas:true,frames:state.frames,uptimeMs:Math.round(performance.now()-state.startedAt)}:{active:false}};
})();
