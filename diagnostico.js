document.getElementById('test-all').onclick=async()=>{
 const report=document.getElementById('test-report');const results=[];
 resetToCover();el('welcome').hidden=true;await enterFullscreen();
 const list=['media/inicio.mp4',...Object.values(videos),'media/final.mp4'];
 for(const src of list){
  openVideo(src,'memory');player.muted=true;
  await new Promise(resolve=>setTimeout(resolve,3500));
  const details=['skip','last-photo','pause','restart','fullscreen'].map(id=>{
   const b=el(id),r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return {id,visible:!b.hidden&&r.width>0&&r.bottom<=innerHeight&&r.right<=innerWidth,hit:!!hit&&b.contains(hit)};
  });
  results.push(src.split('/').pop()+': '+(details.every(d=>d.visible&&d.hit)?'OK':JSON.stringify(details)));
  report.textContent=results.join('\n');
 }
 activeVideo=null;videoToken++;player.pause();report.textContent+='\nFIN';
};
