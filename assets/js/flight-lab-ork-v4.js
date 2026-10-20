'use strict';
(() => {
const $ = id => document.getElementById(id);
const scene=$('scene'), aChart=$('altChart'), sChart=$('speedChart');
const ui={}; for(const id of ['v0','side','wind','drag','bearing','elev']) ui[id]=$(id);
let rows=[], apIdx=0, index=0, anim=false, lastFrame=0, elapsed=0, source='demo', yaw=0.58,pitch=0.33,zoom=1,dragging=false,px=0,py=0;
const clamp=(a,l,h)=>Math.max(l,Math.min(h,a));
const fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d):'—';
const norm=v=>Math.hypot(...v), vecNorm=v=>{const mag=norm(v);return mag>1e-12?v.map(q=>q/mag):[0,0,0]};
function demo(){
  let t=0, x=0,y=0,z=25, vx=+ui.side.value,vy=1.5,vz=+ui.v0.value;
  let recovering=false, dt=.08;let wind=+ui.wind.value, k=+ui.drag.value;
  const out=[];
  for(let n=0;n<2500;n++){
    let damping=recovering?1.13:k;
    let ax=-damping*(vx-wind),ay=-damping*vy,az=-9.81-damping*vz;
    out.push({t,x,y,z,vx,vy,vz,ax,ay,az});
    if(vz<=0) recovering=true;
    vx+=ax*dt;vy+=ay*dt;vz+=az*dt;
    x+=vx*dt;y+=vy*dt;z+=vz*dt;t+=dt;
    if(z<=0&&n>2){out.push({t,x,y,z:0,vx,vy,vz,ax,ay,az});break;}
  }
  return out;
}
let cache={};
function buildCache(){
 const z=rows.map(r=>r.z),s=rows.map(r=>Math.hypot(r.vx,r.vy,r.vz)),x=rows.map(r=>r.x),y=rows.map(r=>r.y);
 const lo=a=>a.reduce((m,v)=>Math.min(m,v),Infinity),hi=a=>a.reduce((m,v)=>Math.max(m,v),-Infinity);
 const at=(a,v)=>a.indexOf(v);
 const acc=rows.map(r=>Math.hypot(r.ax,r.ay,r.az));
 cache={peakSpeed:hi(s),peakSpeedT:rows[at(s,hi(s))].t,peakAccel:hi(acc),peakAccelT:rows[at(acc,hi(acc))].t,series:{z,s},min:{z:lo(z),s:lo(s)},max:{z:hi(z),s:hi(s)},minX:lo(x),maxX:hi(x),minY:lo(y),maxY:hi(y)};
}
function updateLabels(){$('v0val').textContent=fmt(+ui.v0.value,0)+' m/s';$('sideval').textContent=fmt(+ui.side.value,1)+' m/s';$('windval').textContent=fmt(+ui.wind.value,1)+' m/s';$('dragval').textContent=fmt(+ui.drag.value,2)+' /s';$('bearingval').textContent=ui.bearing.value+'°';$('elevval').textContent=ui.elev.value+'°';}
function useData(data,kind,notes=[]){
 if(!data||data.length<3)throw Error('Need at least 3 valid measurements.');
 const max=20000;
 for(let i=0;i<data.length;i++){const r=data[i],where='row '+(r.line||i+1);
  if(!Number.isFinite(r.t+r.x+r.y+r.z))throw Error('Non-numeric time or position at '+where+'.');
  if(i>0&&r.t<=data[i-1].t)throw Error('Times must increase: '+where+' (t='+r.t+') is not after the previous row (t='+data[i-1].t+').');}
 // Fill missing velocity/acceleration columns using nonuniform-time numerical differentiation.
 const diff=(i,key)=>{let l=Math.max(i-1,0),h=Math.min(i+1,data.length-1);return (data[h][key]-data[l][key])/(data[h].t-data[l].t)};
 for(let i=0;i<data.length;i++)for(const [q,p] of [['vx','x'],['vy','y'],['vz','z']])if(!Number.isFinite(data[i][q]))data[i][q]=diff(i,p);
 for(let i=0;i<data.length;i++)for(const [q,p] of [['ax','vx'],['ay','vy'],['az','vz']])if(!Number.isFinite(data[i][q]))data[i][q]=diff(i,p);
 if(data.length>max){ // thin long logs evenly, always keeping the apogee and the last sample
  let peak=0;for(let i=1;i<data.length;i++)if(data[i].z>data[peak].z)peak=i;
  const stride=Math.ceil(data.length/max),keep=new Set([peak,data.length-1]);
  for(let i=0;i<data.length;i+=stride)keep.add(i);
  notes=[...notes,'Log thinned from '+data.length+' to '+keep.size+' samples for display'];
  data=data.filter((_,i)=>keep.has(i));
 }
 rows=data;source=kind;apIdx=0;for(let i=1;i<rows.length;i++)if(rows[i].z>rows[apIdx].z)apIdx=i;
 buildCache();
 anim=false;$('playBtn').textContent='▶ Play';index=0;elapsed=rows[0].t;$('timeline').value=0;
 $('sourceBadge').textContent=kind==='demo'?'DEMO':'IMPORTED';$('rowsInfo').textContent=rows.length+' samples · '+(kind==='demo'?'illustrative motion':'imported log');$('error').textContent=notes.join('. ');
 const ap=rows[apIdx];$('liveSummary').textContent='Flight loaded: '+rows.length+' samples, apogee '+fmt(ap.z)+' m at '+fmt(ap.t)+' s, duration '+fmt(rows.at(-1).t-rows[0].t)+' s.';
 renderAll();
}
function tryDemo(){updateLabels(); try{useData(demo(),'demo')}catch(e){$('error').textContent=e.message}}
for(const id of ['v0','side','wind','drag'])ui[id].addEventListener('input',()=>{updateLabels();if(source==='demo')tryDemo()});
for(const id of ['bearing','elev'])ui[id].addEventListener('input',()=>{updateLabels();renderAll()});
for(const id of ['showVel','showAcc','showRef'])$(id).addEventListener('change',renderScene);
$('demoBtn').addEventListener('click',tryDemo);
const TIME_UNITS={s:1,sec:1,ms:.001,min:60};
const LENGTH_UNITS={m:1,meter:1,meters:1,ft:.3048,feet:.3048,'in':.0254,cm:.01,mm:.001,km:1000,yd:.9144,mi:1609.344};
const VELOCITY_UNITS={'m/s':1,'ft/s':.3048,'in/s':.0254,'km/h':1/3.6,kph:1/3.6,mph:.44704,kt:.514444,kts:.514444,kn:.514444};
const ACCEL_UNITS={'m/s2':1,'ft/s2':.3048,g:9.80665};
function parseCsv(text){
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
 const headerIndex=lines.findIndex(line=>/^\s*#?\s*time\s*(?:\(|\[|[,;\t]|$)/i.test(line)&&/altitude|height|(?:^|[^a-z])z(?:[^a-z]|$)/i.test(line));
 if(headerIndex<0)throw Error('Could not find a header row. Use time,x,y,z (optionally vx,vy,vz) or an OpenRocket export with Time and Altitude columns.');
 const head=lines[headerIndex].replace(/^\s*#\s*/,'').trim();
 const delimiter=[',','\t',';'].sort((a,b)=>head.split(b).length-head.split(a).length)[0];
 const rawHeaders=head.split(delimiter).map(s=>s.trim());
 const headers=rawHeaders.map(s=>s.toLowerCase().replace(/\([^)]*\)/g,'').replace(/\[[^\]]*\]/g,'').replace(/[^a-z0-9]/g,''));
 const col=(...names)=>headers.findIndex(h=>names.includes(h));
 const cols={t:col('time','t','times'),z:col('altitude','z','height','altitudeagl'),x:col('positioneastoflaunch','positioneast','east','x'),y:col('positionnorthoflaunch','positionnorth','north','y'),vz:col('verticalvelocity','vz','velocityz'),az:col('verticalacceleration','az','accelerationz'),vx:col('vx','velocityeast'),vy:col('vy','velocitynorth'),ax:col('ax','accelerationx'),ay:col('ay','accelerationy')};
 if(cols.t<0||cols.z<0)throw Error('Time or altitude missing from header: '+head.slice(0,100));
 // Convert unit-tagged columns, e.g. "Altitude (ft)", to meters, m/s, m/s^2 and seconds.
 const scale={},notes=[];
 for(const k of Object.keys(cols)){
  if(cols[k]<0)continue;
  const tag=(rawHeaders[cols[k]].match(/[(\[]([^)\]]*)[)\]]/)||[])[1];
  if(!tag)continue;
  const unit=tag.toLowerCase().replace(/\s+/g,'').replace(/²|\^2/g,'2');
  const table=k==='t'?TIME_UNITS:/^a/.test(k)?ACCEL_UNITS:/^v/.test(k)?VELOCITY_UNITS:LENGTH_UNITS;
  if(unit in table&&table[unit]!==1){scale[k]=table[unit];notes.push(rawHeaders[cols[k]]+' converted to SI')}
  else if(!(unit in table))notes.push('Unrecognized unit "'+tag+'" in '+rawHeaders[cols[k]]+'; treated as SI')
 }
 const out=[];
 for(let i=headerIndex+1;i<lines.length;i++){
   const line=lines[i].trim();if(!line||line.startsWith('#'))continue;
   const values=line.split(delimiter);
   const num=k=>cols[k]>=0&&values[cols[k]]!==undefined&&values[cols[k]].trim()!==''?Number(values[cols[k]])*(scale[k]||1):NaN;
   const t=num('t'),z=num('z');if(!Number.isFinite(t)||!Number.isFinite(z))continue;
   const v={t,z,x:Number.isFinite(num('x'))?num('x'):0,y:Number.isFinite(num('y'))?num('y'):0,line:i+1};
   for(const k of ['vx','vy','vz','ax','ay','az'])v[k]=num(k);
   out.push(v);
 }
 if(out.length<3)throw Error('Could not find at least 3 valid flight measurements (got '+out.length+').');
 out.notes=[...new Set(notes)];
 return out;
}
async function loadFile(file){
 try{const data=parseCsv(await file.text());useData(data,'import',data.notes)}catch(error){$('error').textContent=error.message}
}
$('csvInput').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 await loadFile(file);e.target.value='';
});
window.addEventListener('dragover',e=>{if(e.dataTransfer&&[...e.dataTransfer.types].includes('Files'))e.preventDefault()});
window.addEventListener('drop',e=>{const file=e.dataTransfer&&e.dataTransfer.files[0];if(!file)return;e.preventDefault();loadFile(file)});
function csvText(array){return 'time,x,y,z,vx,vy,vz,ax,ay,az\n'+array.map(r=>['t','x','y','z','vx','vy','vz','ax','ay','az'].map(k=>fmt(r[k],5)).join(',')).join('\n')+'\n'}
function download(content,name,mime='text/csv') {let a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type:mime}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
$('exportBtn').addEventListener('click',()=>download(csvText(rows),'schwab_lab_flight_data.csv'));
// Local-only snapshot of the current trajectory for follow-up analysis.
$('saveFlightBtn').addEventListener('click',()=>{
 try{localStorage.setItem('schwabLabSavedFlight',JSON.stringify({version:1,when:new Date().toISOString(),rows:rows.slice(0,20000)}));$('error').textContent='Saved flight data in this browser. Export a CSV for a portable copy.'}catch(e){$('error').textContent='Browser storage unavailable or full; export CSV instead.'}
});
$('loadFlightBtn').addEventListener('click',()=>{
 try{const saved=JSON.parse(localStorage.getItem('schwabLabSavedFlight')||'null');if(!saved||!Array.isArray(saved.rows))throw Error('No saved flight found in this browser.');useData(saved.rows,'saved');$('error').textContent='Loaded your saved flight.'}catch(e){$('error').textContent=e.message||'Could not load the saved flight.'}
});

$('csvHelp').addEventListener('click',()=>download('time,x,y,z\n0,0,0,0\n1,1,0,10\n2,2,1,18\n3,3,2,21\n4,4,3,19\n5,5,3,12\n6,6,4,0\n','flight_csv_template.csv'));
function now(){ // state at the playback time, linearly interpolated between the two surrounding samples
 const b=rows[index];if(index<=0||elapsed>=b.t)return b;
 const a=rows[index-1],f=clamp((elapsed-a.t)/(b.t-a.t),0,1),out={};
 for(const k of ['x','y','z','vx','vy','vz','ax','ay','az'])out[k]=a[k]+(b[k]-a[k])*f;
 out.t=elapsed;return out;
}
const timeIndex=t=>{let l=0,h=rows.length-1;while(l<h){let m=(l+h)>>1;if(rows[m].t<t)l=m+1;else h=m}return clamp(l,0,rows.length-1)};
function setTime(t){elapsed=clamp(t,rows[0].t,rows.at(-1).t);index=timeIndex(elapsed);$('timeline').value=Math.round(1000*(elapsed-rows[0].t)/(rows.at(-1).t-rows[0].t));renderAll()}
$('timeline').addEventListener('input',e=>{anim=false;$('playBtn').textContent='▶ Play';setTime(rows[0].t+(rows.at(-1).t-rows[0].t)*e.target.value/1000)});
$('playBtn').addEventListener('click',()=>{anim=!anim;$('playBtn').textContent=anim?'❚❚ Pause':'▶ Play';if(anim&&index>=rows.length-1){elapsed=rows[0].t;index=0}lastFrame=0;if(anim)startLoop()});
$('stepBtn').addEventListener('click',()=>{anim=false;$('playBtn').textContent='▶ Play';index=Math.min(index+1,rows.length-1);setTime(rows[index].t)});
$('resetCam').addEventListener('click',()=>{yaw=.58;pitch=.33;zoom=1;renderScene()});
const touches=new Map();let pinchDist=0;
const pinchSpan=()=>{const [a,b]=[...touches.values()];return Math.hypot(a.x-b.x,a.y-b.y)};
scene.addEventListener('pointerdown',e=>{dragging=true;px=e.clientX;py=e.clientY;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2)pinchDist=pinchSpan();scene.setPointerCapture(e.pointerId)});
scene.addEventListener('pointermove',e=>{
 if(!dragging)return;
 if(touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(touches.size===2){const d=pinchSpan();if(pinchDist>0){zoom=clamp(zoom*d/pinchDist,.45,3);renderScene()}pinchDist=d;return}
 yaw+=(e.clientX-px)*.008;pitch=clamp(pitch+(e.clientY-py)*.008,-1.2,1.2);px=e.clientX;py=e.clientY;renderScene()});
const endPointer=e=>{touches.delete(e.pointerId);if(touches.size===1){const p=[...touches.values()][0];px=p.x;py=p.y}if(!touches.size)dragging=false};
scene.addEventListener('pointerup',endPointer);scene.addEventListener('pointercancel',endPointer);
scene.addEventListener('keydown',e=>{
 const step=.08;let used=true;
 if(e.key==='ArrowLeft')yaw-=step;else if(e.key==='ArrowRight')yaw+=step;
 else if(e.key==='ArrowUp')pitch=clamp(pitch-step,-1.2,1.2);else if(e.key==='ArrowDown')pitch=clamp(pitch+step,-1.2,1.2);
 else if(e.key==='+'||e.key==='=')zoom=clamp(zoom*1.1,.45,3);else if(e.key==='-')zoom=clamp(zoom/1.1,.45,3);
 else used=false;
 if(used){e.preventDefault();renderScene()}});
scene.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*Math.exp(-e.deltaY*.001),.45,3);renderScene()},{passive:false});
function fitCanvas(el){let width=el.clientWidth,height=el.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);let w=Math.max(1,Math.round(width*dpr)),h=Math.max(1,Math.round(height*dpr));if(el.width!==w||el.height!==h){el.width=w;el.height=h}let cx=el.getContext('2d');cx.setTransform(dpr,0,0,dpr,0,0);return {ctx:cx,w:width,h:height}}
function project(p,center,worldScale,w,h){
 let x=p.x-center.x,y=p.y-center.y,z=p.z-center.z;
 let X=Math.cos(yaw)*x-Math.sin(yaw)*y,Y=Math.sin(yaw)*x+Math.cos(yaw)*y;
 let vert=Math.cos(pitch)*z-Math.sin(pitch)*Y;
 let horiz=X;return {x:w/2+horiz*worldScale,y:h*.55-vert*worldScale};
}
function drawArrow(ctx,a,b,color,dashed=false,opacity=1){const angle=Math.atan2(b.y-a.y,b.x-a.x);ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2.4;ctx.globalAlpha=opacity;ctx.setLineDash(dashed?[5,5]:[]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);const size=8;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-size*Math.cos(angle-.45),b.y-size*Math.sin(angle-.45));ctx.lineTo(b.x-size*Math.cos(angle+.45),b.y-size*Math.sin(angle+.45));ctx.closePath();ctx.fill();ctx.restore()}
function drawScene(){
 if(!rows.length)return;
 let {ctx,w,h}=fitCanvas(scene);ctx.clearRect(0,0,w,h);
 const r0=rows[0],maxZ=cache.max.z,minZ=Math.min(0,cache.min.z);
 const {minX,maxX,minY,maxY}=cache;
 let range=Math.max(maxZ-minZ,maxX-minX,maxY-minY,10),center={x:(minX+maxX)/2,y:(minY+maxY)/2,z:(minZ+maxZ)/2};
 let worldScale=Math.min(w*.68,h*.73)/range*zoom;
 const point=p=>project(p,center,worldScale,w,h);
 const origin={x:r0.x,y:r0.y,z:0};
 let step=Math.pow(10,Math.floor(Math.log10(range/4)));if(range/(step)>11)step*=2;if(range/(step)>11)step*=2;
 ctx.lineWidth=.8;ctx.strokeStyle='#31506780';
 for(let i=-5;i<=5;i++){
  for(const [a,b] of [[{x:origin.x+i*step,y:origin.y-5*step,z:0},{x:origin.x+i*step,y:origin.y+5*step,z:0}],[{x:origin.x-5*step,y:origin.y+i*step,z:0},{x:origin.x+5*step,y:origin.y+i*step,z:0}]]){let A=point(a),B=point(b);ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke()}
 }
 // axes and ticks
 let axes=[{d:[1,0,0],lbl:'EAST (x)',c:'#8aa9bc'},{d:[0,1,0],lbl:'NORTH (y)',c:'#8aa9bc'},{d:[0,0,1],lbl:'UP (z)',c:'#83cfb9'}];
 ctx.font='11px ui-sans-serif,system-ui';
 for(let axis of axes){let P=point(origin),Q=point({x:origin.x+axis.d[0]*range*.7,y:origin.y+axis.d[1]*range*.7,z:axis.d[2]*range*.7});ctx.strokeStyle=axis.c;ctx.lineWidth=1.25;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(P.x,P.y);ctx.lineTo(Q.x,Q.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=axis.c;ctx.fillText(axis.lbl,Q.x+4,Q.y-4)}
 // full path and traveled track
 const drawPath=(end,color,lineWidth,tail)=>{ctx.beginPath();let jump=Math.max(1,Math.ceil(rows.length/2400));for(let i=0;i<=end;i+=jump){let q=point(rows[i]);if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y)}let final=point(tail||rows[end]);ctx.lineTo(final.x,final.y);ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke()};
 drawPath(rows.length-1,'#45778c',1.7);drawPath(Math.max(0,index-1),'#4fe7ca',3.2,now());
 const peak=point(rows[apIdx]);ctx.fillStyle='#fcbd72';ctx.beginPath();ctx.arc(peak.x,peak.y,4.2,0,Math.PI*2);ctx.fill();ctx.font='11px system-ui';ctx.fillText('APOGEE',peak.x+8,peak.y-7);
 let r=now(),p=point(r);let dotrad=5.5;ctx.fillStyle='#ddfff8';ctx.beginPath();ctx.arc(p.x,p.y,dotrad,0,2*Math.PI);ctx.fill();ctx.strokeStyle='#61e4d1';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(p.x,p.y,dotrad+5,0,2*Math.PI);ctx.stroke();
 // directional arrows use constant display lengths; no physical proportionality intended.
 let L=Math.min(range*.24,Math.max(14,range*.16));
 const v=[r.vx,r.vy,r.vz],a=[r.ax,r.ay,r.az];
 for(let [toggle,data,col] of [['showVel',v,'#79bfff'],['showAcc',a,'#ffbd73']]){
  if(!$(toggle).checked||norm(data)<1e-9)continue;
  let d=vecNorm(data),q=point({x:r.x+d[0]*L,y:r.y+d[1]*L,z:r.z+d[2]*L});drawArrow(ctx,p,q,col);
 }
 if($('showRef').checked){let b=+ui.bearing.value*Math.PI/180,e=+ui.elev.value*Math.PI/180,d=[Math.cos(e)*Math.sin(b),Math.cos(e)*Math.cos(b),Math.sin(e)],q=point({x:r.x+d[0]*L,y:r.y+d[1]*L,z:r.z+d[2]*L});drawArrow(ctx,p,q,'#c6a3ff',true,.95)}
}
function drawPlot(canvas,key,color){
 if(!rows.length)return;const {ctx,w,h}=fitCanvas(canvas);ctx.clearRect(0,0,w,h);
 const g={l:48,r:18,t:37,b:28},plotW=Math.max(1,w-g.l-g.r),plotH=Math.max(1,h-g.t-g.b);
 let values=cache.series[key==='z'?'z':'s'];let rawMin=cache.min[key==='z'?'z':'s'],rawMax=cache.max[key==='z'?'z':'s'],ymin=Math.min(0,rawMin),ymax=Math.max(1,rawMax*1.11);if(ymax-ymin<.01)ymax=ymin+1;
 const time0=rows[0].t,span=Math.max(.00001,rows.at(-1).t-time0);
 const tx=t=>g.l+(t-time0)/span*plotW;
 const ty=v=>g.t+(ymax-v)/(ymax-ymin)*plotH;
 ctx.lineWidth=1;ctx.font='10px system-ui';ctx.textAlign='right';
 for(let i=0;i<=4;i++){let value=ymin+(ymax-ymin)*i/4,yy=ty(value);ctx.strokeStyle='#294357';ctx.beginPath();ctx.moveTo(g.l,yy);ctx.lineTo(w-g.r,yy);ctx.stroke();ctx.fillStyle='#7e9db4';ctx.fillText(fmt(value,value>=100?0:1),g.l-8,yy+4)}
 ctx.fillStyle='#819cb1';ctx.textAlign='center';for(let i=0;i<=4;i++){let t=time0+span*i/4;ctx.fillText(fmt(t,1)+' s',tx(t),h-10)}
 ctx.beginPath();let stride=Math.max(1,Math.floor(rows.length/2400));for(let i=0;i<rows.length;i+=stride){let x=tx(rows[i].t),y=ty(values[i]);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.lineTo(tx(rows.at(-1).t),ty(values.at(-1)));ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
 const c=now(),t=c.t,cv=key==='z'?c.z:Math.hypot(c.vx,c.vy,c.vz);ctx.setLineDash([4,5]);ctx.strokeStyle='#f1f6ffbb';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tx(t),g.t);ctx.lineTo(tx(t),h-g.b);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle=color;ctx.beginPath();ctx.arc(tx(t),ty(cv),4.5,0,2*Math.PI);ctx.fill();
}
function renderTelemetry(){let r=now(),ap=rows[apIdx];$('clock').textContent=fmt(r.t,1)+' s';$('altValue').innerHTML=fmt(r.z)+' <small>m</small>';$('spdValue').innerHTML=fmt(norm([r.vx,r.vy,r.vz]))+' <small>m/s</small>';$('apValue').innerHTML=fmt(ap.z)+' <small>m</small>';$('apTime').textContent='Apogee time: '+fmt(ap.t)+' s';$('maxSpeed').textContent=fmt(cache.peakSpeed)+' m/s at '+fmt(cache.peakSpeedT)+' s';$('maxAccel').textContent=fmt(cache.peakAccel/9.80665,1)+' g at '+fmt(cache.peakAccelT)+' s';const last=rows.length-1;$('phase').textContent=index===last&&index>apIdx?(rows[last].z<=rows[0].z+1?'LANDED':'END OF LOG'):index<apIdx?'ASCENT':index===apIdx?'APOGEE':'DESCENT';
 for(let k of ['vx','vy','vz'])$(k).textContent=fmt(r[k],2)+' m/s';$('accel').textContent=fmt(norm([r.ax,r.ay,r.az]),2)+' m/s²';
 let b=+ui.bearing.value*Math.PI/180,e=+ui.elev.value*Math.PI/180,d=[Math.cos(e)*Math.sin(b),Math.cos(e)*Math.cos(b),Math.sin(e)],v=[r.vx,r.vy,r.vz],vm=norm(v),c=vm<1e-7?NaN:clamp(v.reduce((s,n,i)=>s+n*d[i],0)/vm,-1,1);
 $('errorAngle').textContent=Number.isFinite(c)?fmt(Math.acos(c)*180/Math.PI)+'°':'—';$('drift').textContent=fmt(Math.hypot(r.x-rows[0].x,r.y-rows[0].y))+' m';$('duration').textContent=fmt(rows.at(-1).t-rows[0].t)+' s';
}
function renderScene(){drawScene()}
function renderAll(){if(!rows.length)return;renderTelemetry();drawScene();drawPlot(aChart,'z','#4de1c6');drawPlot(sChart,'s','#7dbfff')}
let loopOn=false;
function startLoop(){if(!loopOn){loopOn=true;lastFrame=0;requestAnimationFrame(frame)}}
window.addEventListener('resize',renderAll);
function frame(ts){if(!anim||!rows.length){loopOn=false;return}{if(!lastFrame)lastFrame=ts;let dt=Math.min((ts-lastFrame)/1000,.15);elapsed+=dt*Number($('speed').value);if(elapsed>=rows.at(-1).t){elapsed=rows.at(-1).t;anim=false;$('playBtn').textContent='▶ Play'}index=timeIndex(elapsed);$('timeline').value=Math.round(1000*(elapsed-rows[0].t)/(rows.at(-1).t-rows[0].t));renderAll()}lastFrame=ts;if(anim)requestAnimationFrame(frame);else loopOn=false}
tryDemo();
// Receive a passive simulated trajectory from Physics Studio via same-tab session storage.
try{const transferred=sessionStorage.getItem('schwabLabPhysicsFlight');if(transferred){sessionStorage.removeItem('schwabLabPhysicsFlight');useData(JSON.parse(transferred),'physics')}}catch(e){$('error').textContent='Unable to open the transferred simulation.'}
const api={get rows(){return rows},get index(){return index},parseCsv,renderAll};
window.FlightLab=api;
window.__schwabLabTest=api; // kept for older pages and tests
})();