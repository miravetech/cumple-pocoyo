'use strict';
let pano,dirty=false,baseline='';
const $=id=>document.getElementById(id),properties=['ath','atv','scale','rx','ry','rz','width','height','ox','oy','edge','depth','zorder'];
const names=Array.from({length:44},(_,i)=>'foto_'+String(i+1).padStart(2,'0'));
const snapshot=()=>JSON.stringify(names.map(name=>properties.map(k=>pano.get('hotspot['+name+'].'+k))));
// Solo se altera la visibilidad en memoria: no forma parte del XML exportado.
const originalVisibility=new Map();
function restorePhotos(){
 for(const [name,visible] of originalVisibility)pano.set('hotspot['+name+'].visible',visible);
 originalVisibility.clear();
}
window.pocoyoSelect=id=>{
 const selected='foto_'+id;
 if(!pano||!names.includes(selected))return;
 for(const name of names){
  if(!originalVisibility.has(name))originalVisibility.set(name,pano.get('hotspot['+name+'].visible'));
  pano.set('hotspot['+name+'].visible',name===selected);
 }
 if(pano.get('_activehtsp')!==selected){
  pano.set('_activehtsp',selected);
  pano.set('_orscale',pano.get('hotspot['+selected+'].scale'));
 }
 pano.set('layer[dhe_activehtsp].html','Hotspot Name: '+selected);
 for(const key of ['rx','ry','rz','scale'])pano.set('layer[dhe_'+key+'_val].html',String(pano.get('hotspot['+selected+'].'+key)));
 for(const key of ['ath','atv'])pano.set('layer[dhe_val_'+key+'].html',key.toUpperCase()+' = '+pano.get('hotspot['+selected+'].'+key));
 $('photos').value=id;
 $('status').textContent='Editando foto '+id+' · Las demás están ocultas temporalmente.';
};
window.pocoyoToolboxSelect=()=>{
 const name=pano&&pano.get('_activehtsp');
 if(typeof name==='string'&&names.includes(name))pocoyoSelect(name.slice(5));
};
window.pocoyoClick=id=>window.pocoyoSelect(id);
embedpano({xml:'tour.xml?v=renumeracion-2',target:'pano',onready:k=>{pano=k;let tries=0;const timer=setInterval(()=>{if(!pano.get('hotspot[foto_44]')){if(++tries>200){clearInterval(timer);$('status').textContent='No se han cargado las imágenes. Revisa los errores del tour.'}return}clearInterval(timer);for(const name of names)for(const key of ['visible','enabled','capture'])pano.set('hotspot['+name+'].'+key,true);for(let i=1;i<=44;i++){const id=String(i).padStart(2,'0');$('photos').add(new Option('Foto '+id+' · foto_'+id,id))}document.querySelectorAll('button,select').forEach(e=>e.disabled=false);baseline=snapshot();$('status').textContent='Listo. Abre Toolbox para colocar las fotos.';setInterval(()=>{dirty=snapshot()!==baseline},700)},100)}});
$('find').onclick=()=>{const id=$('photos').value,h=pano.get('hotspot[foto_'+id+']');pano.call('lookto('+Number(h.ath)+','+Number(h.atv)+',90,smooth(100,50,100));');pocoyoSelect(id)};
$('photos').onchange=()=>$('find').onclick();
$('show-all').onclick=()=>{restorePhotos();$('status').textContent='Vista conjunta restaurada. Selecciona otra foto para trabajar solo con ella.'};
$('toolbox').onclick=()=>pano.call('ShowTool(dhe);');
$('export').onclick=async()=>{try{const response=await fetch('tour.xml',{cache:'no-store'});if(!response.ok)throw Error('No se puede leer tour.xml');const doc=new DOMParser().parseFromString(await response.text(),'application/xml');if(doc.querySelector('parsererror'))throw Error('XML no válido');for(const name of names){const node=doc.querySelector('hotspot[name="'+name+'"]');if(!node)throw Error('Falta '+name);for(const key of properties){const v=pano.get('hotspot['+name+'].'+key);if(v!==undefined&&v!==null&&v!=='')node.setAttribute(key,typeof v==='number'?String(Math.round(v*1000000)/1000000):String(v))}}const text='<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(doc);const url=URL.createObjectURL(new Blob([text],{type:'application/xml'})),a=document.createElement('a');a.href=url;a.download='tour.xml';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);baseline=snapshot();dirty=false;$('status').textContent='XML descargado. Reemplaza tour.xml en esta carpeta para conservar las posiciones.'}catch(e){$('status').textContent='No se pudo guardar: '+e.message}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
