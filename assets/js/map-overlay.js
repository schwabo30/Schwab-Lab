'use strict';
/* Schwab Lab passive map overlay. NOT an operational launch or recovery predictor. */
(() => {
 const $=id=>document.getElementById(id);
 let map=null, path=null, progress=null, dot=null, origin=null, lastRows=null, lastLength=0, active=false;
 let lastIndex=-1, lastRender=0, looping=false;
 const dataset=()=>window.FlightLab||window.__schwabLabTest;
 function notify(s){$('mapMessage').textContent=s;}
 function valid(lat,lon){return Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180}
 function toLL(row,first){
   if(!origin)return null;
   const east=row.x-first.x,north=row.y-first.y,lat=origin.lat+north/111320;
   const longitude=origin.lon+east/(111320*Math.max(.01,Math.cos(origin.lat*Math.PI/180)));
   return [Math.max(-85,Math.min(85,lat)),((longitude+540)%360)-180];
 }
 function init(){
   if(map)return;
   if(!window.L){notify('Map library unavailable. The 3D plot still works.');return}
   map=L.map('flightMap',{zoomControl:true,scrollWheelZoom:true}).setView([39,-98],4);
   const satellite=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Imagery © Esri and its imagery providers'});
   const streets=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});
   satellite.addTo(map);L.control.layers({'Satellite imagery':satellite,'Street map':streets}).addTo(map);
   map.on('click',e=>setOrigin(e.latlng.lat,e.latlng.lng,true));
   try{let saved=JSON.parse(localStorage.getItem('schwabLabMapOrigin'));if(saved&&valid(saved.lat,saved.lon))setOrigin(saved.lat,saved.lon,true)}catch(e){}
 }
 function setOrigin(lat,lon,move=false){
   if(!valid(lat,lon)){notify('Enter valid latitude (−90 to 90) and longitude (−180 to 180).');return}
   origin={lat,lon};$('mapLat').value=lat.toFixed(6);$('mapLon').value=lon.toFixed(6);
   try{localStorage.setItem('schwabLabMapOrigin',JSON.stringify(origin))}catch(e){}
   notify('Reference point set. Track is a horizontal visualization of relative x/y data, not a geographic prediction.');
   if(move&&map)map.setView([lat,lon],Math.max(map.getZoom(),14));
   lastRows=null;draw(true);
 }
 function draw(fit=false){
   if(!active||!map||!origin)return;
   const d=dataset();if(!d?.rows?.length)return;
   const rows=d.rows, first=rows[0], last=rows.at(-1);
   if(lastRows!==rows||lastLength!==rows.length){
     lastRows=rows;lastLength=rows.length;
     const stride=Math.max(1,Math.ceil(rows.length/1500));
     const coords=[];
     for(let i=0;i<rows.length;i+=stride)coords.push(toLL(rows[i],first));
     coords.push(toLL(last,first));
     if(path)map.removeLayer(path);
     path=L.polyline(coords,{color:'#5fe5d0',weight:3,opacity:.82}).addTo(map);
     if(progress)map.removeLayer(progress);
     progress=L.polyline([],{color:'#fee1a6',weight:4}).addTo(map);
     if(dot)map.removeLayer(dot);
     dot=L.circleMarker(toLL(first,first),{radius:6,color:'#e2ffff',weight:2,fillColor:'#4de1ca',fillOpacity:1}).addTo(map);
     fit=true;
   }
   const index=Math.max(0,Math.min(rows.length-1,d.index??0));
   if(lastIndex!==index||fit){
     lastIndex=index;const current=toLL(rows[index],first);
     dot.setLatLng(current);
     const stride=Math.max(1,Math.ceil(rows.length/1500));
     const partial=[];for(let i=0;i<index;i+=stride)partial.push(toLL(rows[i],first));partial.push(current);
     progress.setLatLngs(partial);
   }
   if(fit&&path){const bounds=path.getBounds();if(bounds.isValid())map.fitBounds(bounds.pad(.45),{maxZoom:17});}
 }
 $('modeMap').addEventListener('click',()=>{
   active=true;$('flightViewer').classList.add('map-active');$('mapControls').classList.remove('hidden');
   $('modeMap').classList.add('primary');$('mode3d').classList.remove('primary');
   init();if(map){setTimeout(()=>{map.invalidateSize();draw(true)},0)}
   if(!looping){looping=true;requestAnimationFrame(frame)}
   if(!origin)notify('Click the satellite map to select a reference point for displaying your flight track.');
 });
 $('mode3d').addEventListener('click',()=>{
   active=false;$('flightViewer').classList.remove('map-active');$('mapControls').classList.add('hidden');
   $('mode3d').classList.add('primary');$('modeMap').classList.remove('primary');
   dataset()?.renderAll?.();
 });
 function applyFields(){const lat=Number($('mapLat').value),lon=Number($('mapLon').value);if($('mapLat').value.trim()&&$('mapLon').value.trim())setOrigin(lat,lon,true)}
 $('mapLat').addEventListener('change',applyFields);$('mapLon').addEventListener('change',applyFields);
 $('mapFit').addEventListener('click',()=>draw(true));
 function frame(t){if(!active){looping=false;return}if(t-lastRender>100){draw();lastRender=t}requestAnimationFrame(frame)}
})();