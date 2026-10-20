'use strict';
/* Schwab Lab: read-only review of imported recovery records.
No launch parameter optimization, target solutions, or control output. */
(()=>{
const $=id=>document.getElementById(id),R=6371000;
const ids=['siteLat','siteLon','zoneLat','zoneLon','radius','uncertainty','siteDate','temp','pressure','wind','humidity','permission','airspace','hazard','projectName','revision','notes'];
const state={tracks:[],design:null,weather:null,mode:'site',map:null,mark:null,zone:null,layers:[],sat:true};
const val=id=>$(id).value.trim()===''?null:Number($(id).value);
const valid=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const latlon=(lat,lon)=>valid(lat,-90,90)&&valid(lon,-180,180);
const site=()=>latlon(val('siteLat'),val('siteLon'))?[val('siteLat'),val('siteLon')]:null;
const zone=()=>latlon(val('zoneLat'),val('zoneLon'))?[val('zoneLat'),val('zoneLon')]:null;
const note=(s,w=false)=>{$('notice').textContent=s;$('notice').classList.toggle('warn',w)};
const deg=x=>x*180/Math.PI,rad=x=>x*Math.PI/180;
const fmt=x=>Number.isFinite(x)?x.toFixed(1):'—';
function distance(a,b){const dp=rad(b[0]-a[0]),dl=rad(b[1]-a[1]);const t=Math.sin(dp/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(t)))}
function point(x,y,s){if(!s||!Number.isFinite(x)||!Number.isFinite(y))return null;const lat=s[0]+deg(y/R);const lon=s[1]+deg(x/(R*Math.max(.005,Math.cos(rad(s[0])))));return [Math.max(-85,Math.min(85,lat)),((lon+540)%360)-180]}
function choose(mode){state.mode=mode;$('sitePick').classList.toggle('active',mode==='site');$('zonePick').classList.toggle('active',mode==='zone');note('Click on the map to set the '+(mode==='site'?'site reference':'recovery-area center')+'.')}
function initMap(){if(!window.L){note('Map assets are unavailable. You can still enter coordinates and save a study.',true);return}const m=state.map=L.map('landingMap',{scrollWheelZoom:false}).setView([39,-98],4);
state.satTiles=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Imagery © Esri and imagery providers'}).addTo(m);
state.streetTiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});
m.on('click',e=>{const p=state.mode==='site'?'site':'zone';$(p+'Lat').value=e.latlng.lat.toFixed(6);$(p+'Lon').value=e.latlng.lng.toFixed(6);refresh()});
setTimeout(()=>m.invalidateSize(),100);paint()}
function paint(){const m=state.map;if(!m)return;
if(state.mark)m.removeLayer(state.mark);if(state.zone)m.removeLayer(state.zone);for(const layer of state.layers)m.removeLayer(layer);state.layers=[];
const s=site(),z=zone(),r=val('radius');
if(s)state.mark=L.circleMarker(s,{radius:8,color:'#41dbc2',weight:3,fillOpacity:.9}).bindPopup('Recorded site reference').addTo(m);
if(z&&valid(r,20,5000))state.zone=L.circle(z,{radius:r,color:'#85baff',weight:2,fillColor:'#6ca9ef',fillOpacity:.13}).bindPopup('User-designated recovery area, not an authorization').addTo(m);
for(const track of state.tracks){if(!track.hasXY||!s)continue;const first=track.rows[0],last=track.rows.at(-1),p=point(last.x-first.x,last.y-first.y,s);
const path=[],step=Math.max(1,Math.ceil(track.rows.length/1200));for(let i=0;i<track.rows.length;i+=step){const row=track.rows[i];path.push(point(row.x-first.x,row.y-first.y,s))}path.push(p);
if(path.length>1)state.layers.push(L.polyline(path,{weight:2,color:'#6ae9d1',opacity:.7}).bindTooltip(track.name).addTo(m));
if(p){state.layers.push(L.circleMarker(p,{radius:5,color:'#f5c08e',fillOpacity:.9}).bindPopup(track.name+(track.confirmed?' • user-confirmed touchdown':' • last observed sample only')).addTo(m));
if(track.confirmed&&val('uncertainty')>0)state.layers.push(L.circle(p,{radius:Math.min(10000,val('uncertainty')),color:'#ffce8e',weight:1,fillOpacity:.04}).addTo(m))}
}}
function fit(){if(!state.map)return;const l=[state.mark,state.zone,...state.layers].filter(Boolean);if(l.length){const bounds=L.featureGroup(l).getBounds();if(bounds.isValid())state.map.fitBounds(bounds.pad(.25),{maxZoom:17})}else state.map.setView([39,-98],4)}
function cells(s,d){const v=[];let value='',quoted=false;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(c===d&&!quoted){v.push(value.trim());value=''}else value+=c}v.push(value.trim());return v}
const normalize=s=>s.toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g,'').replace(/[^a-z0-9]/g,'');
function parseCSV(src,name){
if(src.length>4e6)throw Error('CSV size limit: 4 MB.');
const lines=src.replace(/^\ufeff/,'').split(/\r?\n/);let header=-1,sep,fields;
for(let i=0;i<Math.min(200,lines.length);i++){const h=lines[i].trim().replace(/^#\s*/,'');if(!/^(time|t)\s*(\(|[,;\t]|$)/i.test(h))continue;
const d=[',',';','\t'].sort((a,b)=>h.split(b).length-h.split(a).length)[0],n=cells(h,d).map(normalize);
if(n.some(x=>['altitude','height','z','zm','altitudeagl'].includes(x))){header=i;sep=d;fields=n;break}}
if(header===-1)throw Error('Time/altitude column headings were not found; OpenRocket commented headings are supported.');
const pick=(...a)=>fields.findIndex(f=>a.includes(f)),idx={t:pick('time','t','times'),z:pick('altitude','z','zm','height','altitudeagl'),x:pick('x','xm','east','positioneastoflaunch','positioneast'),y:pick('y','ym','north','positionnorthoflaunch','positionnorth')};
const hasXY=idx.x>=0&&idx.y>=0,rows=[];let skipped=0,order=0,dup=0,previous=-Infinity;
const warnings=lines.slice(0,header).filter(line=>/^\s*#\s*(?:No recovery device|Discontinuity|.*warning)/i.test(line)).map(line=>line.replace(/^\s*#\s*/, '').trim().slice(0,220)).slice(0,8);
for(let i=header+1;i<lines.length;i++){const line=lines[i].trim();if(!line||line[0]==='#')continue;const data=cells(line,sep);
const get=k=>idx[k]<0||data[idx[k]]===''?NaN:Number(data[idx[k]]);
const t=get('t'),z=get('z'),x=get('x'),y=get('y');
if(!Number.isFinite(t)||!Number.isFinite(z)||(hasXY&&(!Number.isFinite(x)||!Number.isFinite(y)))){skipped++;continue}
if(t<previous)order++;if(t===previous)dup++;previous=t;rows.push({t,z,x:hasXY?x:null,y:hasXY?y:null});
if(rows.length>12000)throw Error('Maximum 12,000 samples per file.')}
rows.sort((a,b)=>a.t-b.t);const unique=[];for(const r of rows){if(unique.length&&unique.at(-1).t===r.t)unique[unique.length-1]=r;else unique.push(r)}
if(unique.length<3)throw Error('Too few valid measurements.');
return {name:String(name).slice(0,120),rows:unique,hasXY,confirmed:false,quality:{skipped,order,dup,warnings},id:Date.now().toString(36)+Math.random().toString(36).slice(2)}
}
function displayTracks(){const el=$('trackList');el.replaceChildren();if(!state.tracks.length){el.textContent='No tracks imported.';return}
for(const run of state.tracks){const box=document.createElement('div');box.className='entry';const title=document.createElement('strong');title.textContent=run.name;box.append(title);
const info=document.createElement('small');info.textContent=run.rows.length+' samples · final altitude '+fmt(run.rows.at(-1).z)+' m · '+(run.hasXY?'east/north available':'altitude only');box.append(info);
const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=run.confirmed;label.append(check,document.createTextNode(' I verified this log ends at touchdown'));box.append(label);
check.addEventListener('change',()=>{run.confirmed=check.checked;refresh()});
const remove=document.createElement('button');remove.textContent='Remove run';remove.addEventListener('click',()=>{state.tracks=state.tracks.filter(t=>t.id!==run.id);refresh()});box.append(remove);el.append(box)}}
function flag(title,detail,warn=false){const el=document.createElement('div');el.className='flag'+(warn?' warn':'');const a=document.createElement('strong'),b=document.createElement('p');a.textContent=title;b.textContent=detail;el.append(a,b);$('flags').append(el)}
function evaluate(){
const s=site(),z=zone(),r=val('radius'),runs=state.tracks,records=runs.filter(t=>t.confirmed&&t.hasXY&&Math.abs(t.rows.at(-1).z)<=10);let inside=0;
const result=$('results');result.replaceChildren();for(const run of runs){let outcome='No geographic review available';
if(!s||!z)outcome='Enter site and recovery area';
else if(!run.hasXY)outcome='Horizontal measurements missing';
else if(!run.confirmed)outcome='End of recording — touchdown unverified';
else if(Math.abs(run.rows.at(-1).z)>10)outcome='Final altitude not near zero; review touchdown';
else {const first=run.rows[0],last=run.rows.at(-1),p=point(last.x-first.x,last.y-first.y,s);const within=distance(p,z)<=r;if(within)inside++;outcome=within?'Recorded endpoint inside area':'Recorded endpoint outside area'}
const row=document.createElement('div');row.className='result';const a=document.createElement('span'),b=document.createElement('b');a.textContent=run.name;b.textContent=outcome;row.append(a,b);result.append(row)}
if(!runs.length)result.textContent='No imported flight logs to review.';
$('statRuns').textContent=runs.length;$('statMapped').textContent=runs.filter(t=>t.hasXY).length;$('statComplete').textContent=records.length;$('statWithin').textContent=records.length&&s&&z?inside+' / '+records.length:'—';
$('flags').replaceChildren();
if(!s)flag('Site reference missing','Select a reference location to project imported east/north data.',true);
if(!z)flag('Recovery-area boundary missing','Record the authorized area separately from any flight-data analysis.',true);
if(!runs.length)flag('No flight evidence','Import measured data or an independently generated OpenRocket flight export.',true);
for(const run of runs){if(!run.hasXY)flag(run.name+': no map coordinates','This log contains no east/north data.',true);
if(run.confirmed&&Math.abs(run.rows.at(-1).z)>10)flag(run.name+': touchdown unverified','Last altitude is not near zero; excluded from verified-endpoint counts.',true);
if(run.quality?.skipped||run.quality?.order||run.quality?.dup)flag(run.name+': data quality','Skipped '+(run.quality.skipped||0)+', out-of-order '+(run.quality.order||0)+', duplicate times '+(run.quality.dup||0)+'.',true);
for(const warning of run.quality?.warnings||[])flag(run.name+': source warning',warning,true)}
if($('permission').value!=='documented')flag('Site permission outstanding','Property or launch-site permission must be independently documented.',true);
if($('airspace').value!=='documented')flag('FAA airspace review outstanding','Map tiles do not show launch permissions, restrictions, or NOTAMs.',true);
if($('hazard').value!=='none')flag('Safety hazards need assessment',$('hazard').value==='concern'?'A possible hazard has been reported. Seek qualified review.':'Hazards to people, aircraft and property are not yet assessed.',true);
if(!$('siteDate').value)flag('Date/time missing','A site-local date/time helps interpret recorded weather.',false);
flag('Not a launch clearance','No map, imported run, or preliminary checklist establishes legal approval or safety.',false)
}
function showDesign(){const d=state.design;$('designInfo').textContent=d?d.name+' · '+d.source+(d.mass!=null?' · '+d.mass+' g loaded mass':'')+' · metadata only':'No design metadata imported.'}
function refresh(){ $('radiusText').textContent=$('radius').value+' m';displayTracks();showDesign();paint();evaluate()}
function snapshot(){const fields={};for(const id of ids)fields[id]=$(id).value;return {schema:'schwab-recovery-v1',savedAt:new Date().toISOString(),fields,tracks:state.tracks,design:state.design,weather:state.weather}}
function restore(x){if(x?.schema!=='schwab-recovery-v1'||!x.fields||!Array.isArray(x.tracks)||x.tracks.length>10)throw Error('Invalid recovery study.');
for(const id of ids)if(x.fields[id]!=null)$(id).value=String(x.fields[id]).slice(0,id==='notes'?3000:120);
state.tracks=x.tracks.map(t=>{if(!Array.isArray(t.rows)||t.rows.length>12000)throw Error('Oversized imported run');return {...t,name:String(t.name).slice(0,120),confirmed:!!t.confirmed}});state.design=x.design||null;state.weather=x.weather||null;refresh()}
function download(s,name){const url=URL.createObjectURL(new Blob([s],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function importDesign(f){
if(f.size>8e6)throw Error('Design file exceeds 8 MB.');
if(f.name.toLowerCase().endsWith('.ork')){let xml,bytes=new Uint8Array(await f.arrayBuffer());if(bytes[0]===80&&bytes[1]===75){
if(!window.JSZip)throw Error('ZIP library unavailable');const zip=await JSZip.loadAsync(bytes,{checkCRC32:true}),entries=Object.values(zip.files);
if(entries.length>500)throw Error('Archive exceeds entry limit');const p=entries.find(e=>!e.dir&&/(^|\/)rocket\.ork$/i.test(e.name));if(!p)throw Error('Missing rocket.ork');if(p._data?.uncompressedSize>8e6)throw Error('XML too large');xml=await p.async('string')
}else xml=await f.text();if(xml.length>8e6||/<!doctype|<!entity/i.test(xml))throw Error('Unsupported XML');
const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror')||doc.documentElement.localName!=='openrocket')throw Error('Invalid .ork design');
const rocket=Array.from(doc.getElementsByTagName('*')).find(x=>x.localName==='rocket');if(!rocket)throw Error('Missing rocket metadata');
const name=Array.from(rocket.children).find(x=>x.localName==='name')?.textContent||f.name;state.design={name:name.slice(0,120),source:f.name}
}else{
const p=JSON.parse(await f.text());if(p.schema!=='schwab-lab-archive')throw Error('Expected Schwab Lab Design Archive JSON');state.design={name:String(p.name||p.design?.name||f.name).slice(0,120),source:f.name,mass:p.values?.wetMass??null};
if(p.site){const mapping={siteLat:'siteLat',siteLon:'siteLon',siteDateTime:'siteDate',siteTemp:'temp',sitePressure:'pressure',siteWind:'wind',siteHumidity:'humidity'};
for(const [from,to] of Object.entries(mapping))if(p.site[from]!=null)$(to).value=p.site[from];
if(p.site.airspaceReview==='documented')$('airspace').value='documented';
if(p.site.sitePermission==='documented')$('permission').value='documented'}
}refresh()
}
async function weather(){const button=$('weatherBtn');button.disabled=true;try{
const s=site(),dt=$('siteDate').value;if(!s||!dt)throw Error('Enter site and site-local date/time first.');
const day=dt.slice(0,10),delta=Math.round((new Date(day+'T12:00:00Z')-new Date(new Date().toISOString().slice(0,10)+'T12:00:00Z'))/86400000);if(delta>14)throw Error('Date beyond forecast range.');
const history=delta< -5,endpoint=history?'https://archive-api.open-meteo.com/v1/archive':'https://api.open-meteo.com/v1/forecast';
const q=new URLSearchParams({latitude:s[0],longitude:s[1],start_date:day,end_date:day,hourly:'temperature_2m,surface_pressure,relative_humidity_2m,wind_speed_10m',wind_speed_unit:'ms',timezone:'auto'});
if(!history&&delta<0)q.set('past_days','7');
const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);let response;try{response=await fetch(endpoint+'?'+q,{signal:ctrl.signal})}finally{clearTimeout(timeout)}
if(!response.ok)throw Error('Weather server HTTP '+response.status);const body=await response.json(),index=body.hourly?.time?.indexOf(dt.slice(0,13)+':00')??-1;if(index<0)throw Error('No matching weather hour');
for(const [k,v] of Object.entries({temp:'temperature_2m',pressure:'surface_pressure',wind:'wind_speed_10m',humidity:'relative_humidity_2m'})){const n=body.hourly[v]?.[index];if(typeof n==='number'&&Number.isFinite(n))$(k).value=n.toFixed(1)}
state.weather={source:history?'Open-Meteo reanalysis':'Open-Meteo forecast model',time:dt,retrieved:new Date().toISOString()};
$('weatherInfo').textContent='Imported '+state.weather.source+' · '+dt+'; modeled values, not on-site measurements or launch approval.';note('Weather context recorded, not applied to trajectories.')
}catch(e){note('Weather lookup: '+e.message,true)}finally{button.disabled=false}}
function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('SchwabLandingStudy',1);r.onupgradeneeded=()=>r.result.createObjectStore('studies');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function store(){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('studies','readwrite');tx.objectStore('studies').put(snapshot(),'latest');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)})}
async function recover(){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('studies','readonly'),req=tx.objectStore('studies').get('latest');req.onsuccess=()=>{db.close();resolve(req.result)};req.onerror=()=>reject(req.error)})}
$('sitePick').onclick=()=>choose('site');$('zonePick').onclick=()=>choose('zone');$('fitMap').onclick=fit;
$('resetMap').onclick=()=>{for(const id of ['siteLat','siteLon','zoneLat','zoneLon'])$(id).value='';refresh();note('Map reference points cleared.')};
$('baseToggle').onclick=()=>{if(!state.map)return;state.map.removeLayer(state.sat?state.satTiles:state.streetTiles);(state.sat?state.streetTiles:state.satTiles).addTo(state.map);state.sat=!state.sat};
for(const id of ids)$(id).addEventListener('change',refresh);
for(const id of ['siteLat','siteLon','zoneLat','zoneLon','radius','uncertainty'])$(id).addEventListener('input',()=>{paint();evaluate();$('radiusText').textContent=$('radius').value+' m'});
$('trackFiles').onchange=async e=>{try{const files=Array.from(e.target.files);if(files.length+state.tracks.length>10)throw Error('At most ten logs per study.');
const imported=[];for(const f of files){if(f.size>4e6)throw Error(f.name+': exceeds 4 MB');imported.push(parseCSV(await f.text(),f.name))}
state.tracks.push(...imported);refresh();fit();note('Imported '+imported.length+' recorded flight logs. Endpoints are not assumed to be landings.')
}catch(err){note('Import failed: '+err.message,true)}e.target.value=''};
$('designFile').onchange=async e=>{try{const f=e.target.files[0];if(f){await importDesign(f);note('Design metadata imported for documentation.')}}catch(err){note('Design import failed: '+err.message,true)}e.target.value=''};
$('weatherBtn').onclick=weather;
$('save').onclick=async()=>{try{await store();note('Saved to this browser. Export JSON for a durable backup.')}catch(e){note('Save failed: '+e.message,true)}};
$('restore').onclick=async()=>{try{const p=await recover();if(!p)throw Error('No saved study found.');restore(p);fit();note('Study restored.')}catch(e){note('Open failed: '+e.message,true)}};
$('export').onclick=()=>{download(JSON.stringify(snapshot(),null,2),($('projectName').value.replace(/[^a-z0-9_-]/gi,'_').slice(0,60)||'study')+'.schwab.json');note('Study exported, including locations and imported flight data.')};
$('importProject').onchange=async e=>{try{const f=e.target.files[0];if(!f||f.size>20e6)throw Error('Select JSON under 20 MB');restore(JSON.parse(await f.text()));fit();note('Study imported.')}catch(err){note('Project import failed: '+err.message,true)}e.target.value=''};
initMap();refresh();
window.SchwabLandingTest={parseCSV,distance,point,site,zone};
})();