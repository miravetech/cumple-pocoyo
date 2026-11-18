'use strict';
const el=id=>document.getElementById(id),player=el('memory-video');
const sequence=Array.from({length:44},(_,i)=>i+1),videos=window.POCOYO_VIDEOS||{};
const PHOTO_MS=5000,photo=i=>'foto_'+String(sequence[i]).padStart(2,'0');
let viewer,ready=false,stage='cover',current=-1,userPaused=false,blocked=false;
let motion=null,dwell=0,lastTime=null,frame=null,videoToken=0,activeVideo=null,pending=null,noticeTimer=null;
const paused=()=>userPaused||document.hidden||blocked;
const clamp=x=>Math.max(0,Math.min(1,x));
function notify(message){el('notice').textContent=message;el('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el('notice').hidden=true,6500)}
function setHotspot(index,key,value){viewer.set('hotspot['+photo(index)+'].'+key,value)}
function hidePhotos(){for(let i=0;i<sequence.length;i++){setHotspot(i,'visible',false);setHotspot(i,'alpha',1);setHotspot(i,'enabled',false);setHotspot(i,'capture',false)}}
function syncSound(){window.pocoyoSound?.setPlaying(!paused()&&['transition','photo','end'].includes(stage))}
function updateControls(){
 el('pause').disabled=!ready||stage==='cover';
 el('pause').setAttribute('data-resume',String(userPaused||blocked));
 el('pause').setAttribute('aria-label',userPaused||blocked?'Reanudar':'Pausar');
 el('pause').title=userPaused||blocked?'Reanudar':'Pausar';
 el('pause').setAttribute('aria-pressed',String(userPaused));
 el('controls').hidden=false;el('skip').hidden=!activeVideo;syncControlViewport();syncSound();
}

function syncControlViewport(){
 const v=window.visualViewport;
 const right=v?Math.max(0,window.innerWidth-v.width-v.offsetLeft):0;
 const bottom=v?Math.max(0,window.innerHeight-v.height-v.offsetTop):0;
 el('controls').style.setProperty('--viewport-right',right+'px');
 el('controls').style.setProperty('--viewport-bottom',bottom+'px');
}
window.visualViewport?.addEventListener('resize',syncControlViewport);
window.visualViewport?.addEventListener('scroll',syncControlViewport);
window.addEventListener('orientationchange',syncControlViewport);
window.addEventListener('resize',syncControlViewport);
// Every source uses the same inline player; never request fullscreen on the video itself.
player.playsInline=true;player.controls=false;
player.addEventListener('playing',()=>{if(activeVideo)updateControls()});
player.addEventListener('loadedmetadata',syncControlViewport);

function targetFov(h){
 const ratio=Math.max(.35,window.innerWidth/window.innerHeight),r=Number(h.rz||0)*Math.PI/180;
 const w=Math.abs(Number(h.width)*Math.cos(r))+Math.abs(Number(h.height)*Math.sin(r));
 const hgt=Math.abs(Number(h.height)*Math.cos(r))+Math.abs(Number(h.width)*Math.sin(r));
 return Math.min(120,Math.max(16,2*Math.atan(Math.max(hgt,w/ratio)*Number(h.scale)/(1000*.75))*180/Math.PI));
}
function focusPhoto(index){
 const previous=current;current=index;stage='transition';
 const h=viewer.get('hotspot['+photo(index)+']');
 setHotspot(index,'visible',true);setHotspot(index,'alpha',previous<0?1:0);
 const fromH=Number(viewer.get('view.hlookat')),delta=((Number(h.ath)-fromH)%360+540)%360-180;
 motion={previous,index,elapsed:0,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.min(3600,2000+Math.abs(delta)*8),fromH,fromV:Number(viewer.get('view.vlookat')),fromF:Number(viewer.get('view.fov')),delta,toV:Number(h.atv),toF:targetFov(h)};
 updateControls();
}
function showEnd(){hidePhotos();stage='end';el('ending').hidden=false;updateControls()}
function nextPhoto(){if(current===sequence.length-1)openVideo('media/final.mp4','outro');else focusPhoto(current+1)}
function finishVideo(token){
 if(!activeVideo||activeVideo.token!==token)return;
 const kind=activeVideo.kind;activeVideo=null;videoToken++;player.pause();el('video-panel').hidden=true;el('video-resume').hidden=true;blocked=false;
 const next=()=>{if(kind==='intro')focusPhoto(0);else if(kind==='outro')showEnd();else nextPhoto()};
 if(userPaused||document.hidden)pending=next;else next();updateControls();
}
function playActive(){
 if(!activeVideo||userPaused||document.hidden)return;
 const token=activeVideo.token;blocked=false;
 player.play().then(()=>{
  if(!activeVideo||activeVideo.token!==token)return;
  if(userPaused||document.hidden){player.pause();return}
  el('video-resume').hidden=true;el('video-status').textContent='';updateControls();
 }).catch(error=>{
  if(!activeVideo||activeVideo.token!==token||userPaused||document.hidden||error.name==='AbortError')return;
  blocked=true;el('video-resume').hidden=false;el('video-status').textContent='El navegador necesita un toque para continuar con sonido.';updateControls();
 });
}
function openVideo(src,kind){
 const token=++videoToken;activeVideo={token,kind};stage='video';blocked=false;
 el('video-status').textContent='';el('video-resume').hidden=true;el('video-panel').hidden=false;
 player.src=src;player.currentTime=0;player.volume=1;player.muted=false;player.load();
 updateControls();playActive();
}
player.addEventListener('ended',()=>{if(activeVideo&&player.ended)finishVideo(activeVideo.token)});
player.addEventListener('error',()=>{
 if(!activeVideo)return;
 blocked=true;el('video-status').textContent='No se pudo cargar este vídeo. Puedes saltarlo para continuar.';el('video-resume').hidden=false;updateControls();
});
player.addEventListener('pause',()=>{if(activeVideo&&!player.ended&&!userPaused&&!document.hidden){el('video-resume').hidden=false}});
el('video-resume').onclick=()=>{userPaused=false;window.pocoyoSound?.unlock();playActive()};
el('skip').onclick=()=>{if(activeVideo)finishVideo(activeVideo.token)};
function togglePause(){
 if(stage==='cover')return;
 userPaused=blocked?false:!userPaused;
 if(userPaused)player.pause();
 else{window.pocoyoSound?.unlock();if(pending){const next=pending;pending=null;next()}else if(activeVideo)playActive()}
 lastTime=null;updateControls();
}
el('pause').onclick=togglePause;
function fullscreenElement(){return document.fullscreenElement||document.webkitFullscreenElement}
function updateFullscreen(){syncControlViewport();const on=Boolean(fullscreenElement());el('fullscreen').setAttribute('aria-pressed',String(on));el('fullscreen').title=on?'Salir de pantalla completa':'Pantalla completa';el('fullscreen').setAttribute('aria-label',el('fullscreen').title)}
async function enterFullscreen(){
 try{
  if(!fullscreenElement()){
   const root=document.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;
   if(!request){notify(window.innerHeight>window.innerWidth?'Este navegador no permite pantalla completa. Gira el móvil para verlo en horizontal.':'Este navegador no permite pantalla completa; el recorrido sigue ajustado a la pantalla.');return}
   await request.call(root);
  }
  if(window.screen?.orientation?.lock){try{await window.screen.orientation.lock('landscape')}catch{if(window.innerHeight>window.innerWidth)notify('Gira el móvil para verlo en horizontal.')}}
 }catch{if(window.innerHeight>window.innerWidth)notify('Gira el móvil para verlo en horizontal. Puedes seguir sin pantalla completa.')}
 updateFullscreen();
}
el('fullscreen').onclick=()=>{
 if(fullscreenElement()){const exit=document.exitFullscreen||document.webkitExitFullscreen;try{Promise.resolve(exit.call(document)).catch(()=>{})}catch{}}
 else enterFullscreen();
};
document.addEventListener('fullscreenchange',updateFullscreen);document.addEventListener('webkitfullscreenchange',updateFullscreen);
function resetToCover(){
 if(!ready)return;
 activeVideo=null;videoToken++;player.pause();motion=null;pending=null;dwell=0;current=-1;userPaused=false;blocked=false;lastTime=null;
 player.removeAttribute('src');player.load();
 stage='cover';window.pocoyoSound?.reset();
 clearTimeout(noticeTimer);el('notice').hidden=true;
 hidePhotos();el('welcome').hidden=false;el('ending').hidden=true;
 el('video-panel').hidden=true;el('video-resume').hidden=true;el('video-status').textContent='';
 viewer.set('view.hlookat',0);viewer.set('view.vlookat',0);viewer.set('view.fov',100);
 updateControls();
}
function start(){
 if(!ready)return;
 resetToCover();window.pocoyoSound?.unlock();el('welcome').hidden=true;
 openVideo('media/inicio.mp4','intro');enterFullscreen();
}
el('start').onclick=()=>{if(stage==='cover')start()};el('restart').onclick=resetToCover;
el('last-photo').onclick=()=>{
 if(!ready)return;
 resetToCover();window.pocoyoSound?.unlock();el('welcome').hidden=true;
 focusPhoto(sequence.length-1);
};
window.pocoyoClick=()=>{};
function tick(now){
 const dt=lastTime===null?0:Math.min(100,Math.max(0,now-lastTime));lastTime=now;
 if(!paused()){
  if(stage==='transition'&&motion){
   const m=motion;m.elapsed+=dt;const t=m.duration?clamp(m.elapsed/m.duration):1,e=t*t*(3-2*t);
   viewer.set('view.hlookat',m.fromH+m.delta*e);viewer.set('view.vlookat',m.fromV+(m.toV-m.fromV)*e);
   viewer.set('view.fov',Math.min(135,m.fromF+(m.toF-m.fromF)*e+Math.sin(Math.PI*t)*Math.min(14,Math.abs(m.delta)/7)));
   setHotspot(m.index,'alpha',m.previous<0?1:clamp((t-.25)/.75));
   if(m.previous>=0)setHotspot(m.previous,'alpha',1-clamp((t-.7)/.3));
   if(t===1){if(m.previous>=0)setHotspot(m.previous,'visible',false);setHotspot(m.index,'alpha',1);motion=null;stage='photo';dwell=PHOTO_MS}
  }else if(stage==='photo'){
   dwell-=dt;if(dwell<=0){if(videos[sequence[current]])openVideo(videos[sequence[current]],'memory');else nextPhoto()}
  }
 }
 frame=requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange',()=>{
 lastTime=null;
 if(document.hidden)player.pause();
 else if(!userPaused){if(pending){const next=pending;pending=null;next()}else if(activeVideo&&!blocked)playActive()}
 updateControls();
});
window.addEventListener('resize',()=>{
 if(!viewer||current<0)return;
 const h=viewer.get('hotspot['+photo(current)+']');
 if(motion)motion.toF=targetFov(h);else if(stage==='photo')viewer.set('view.fov',targetFov(h));
});
window.addEventListener('pagehide',()=>{player.pause();window.pocoyoSound?.setPlaying(false);cancelAnimationFrame(frame)});
embedpano({xml:'tour.xml?v=renumeracion-2',target:'pano',onready:k=>{
 viewer=k;let tries=0;
 const timer=setInterval(()=>{
  if(!viewer.get('hotspot[foto_44]')){if(++tries>200){clearInterval(timer);el('start-status').textContent='No se pudo cargar el tour. Ábrelo mediante tour_testingserver.exe.'}return}
  clearInterval(timer);hidePhotos();
  for(const name of ['tb_keys','no_d_key'])viewer.set('events['+name+'].onkeydown','');
  viewer.set('layer[skin_layer].visible',false);viewer.set('layer[skin_control_bar].visible',false);
  viewer.set('control.usercontrol','off');viewer.set('view.fovtype','VFOV');viewer.set('view.fovmin',12);viewer.set('view.fovmax',140);viewer.set('view.limitview','off');
  player.src='media/inicio.mp4';player.load();ready=true;el('start').disabled=false;el('restart').disabled=false;el('last-photo').disabled=false;el('start-status').textContent='';
  updateControls();frame=requestAnimationFrame(tick);
 },100);
}});
