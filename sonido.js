'use strict';
// Web Audio se desbloquea con la portada, pero no suena hasta terminar la introducción.
(() => {
 let context=null,buffer=null,source=null,gain=null,offset=0,began=0,wanted=false,loading=null;
 const url='media/Pocoyo%20Theme%20Song%20-%20Fernando11101.mp3';
 function stop(){if(source){offset=(offset+Math.max(0,context.currentTime-began))%buffer.duration;source.stop();source.disconnect();source=null}}
 function sync(){
  if(!wanted||document.hidden){stop();return}
  if(!context||!buffer||source)return;
  if(context.state==='suspended')context.resume().catch(()=>{});
  source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);began=context.currentTime;source.start(0,offset%buffer.duration);
 }
 function unlock(){
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext)return;
  if(!context){context=new AudioContext();gain=context.createGain();gain.gain.value=.22;gain.connect(context.destination)}
  context.resume().catch(()=>{});
  if(!loading)loading=fetch(url).then(r=>{if(!r.ok)throw Error('Audio');return r.arrayBuffer()}).then(data=>context.decodeAudioData(data)).then(b=>{buffer=b;sync()}).catch(()=>{loading=null});
 }
 window.pocoyoSound={unlock,setPlaying(value){wanted=Boolean(value);sync()},reset(){wanted=false;stop();offset=0}};
 document.addEventListener('visibilitychange',sync);
 window.addEventListener('pagehide',()=>{wanted=false;stop()});
})();
