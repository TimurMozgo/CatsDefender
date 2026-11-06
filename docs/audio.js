'use strict';
// Synthesized combat effects; user-provided MP3 clips for results and barricade damage.
window.GameAudio=(()=>{
 let context=null,master=null,enabled=true,epoch=0;
 const voices=new Set(),recent=new Map(),buffers=new Map(),loading=new Map();
 const clips={win:'audio/victory.mp3',lose:'audio/defeat.mp3',damage:'audio/barricade-hit.mp3'};
 try{enabled=localStorage.getItem('cat-defense-sound')!=='off';}catch{}
 function stop(){epoch++;for(const voice of voices){try{voice.stop();}catch{}try{voice.disconnect();}catch{}}voices.clear();recent.clear();}
 function buffer(name){if(buffers.has(name))return Promise.resolve(buffers.get(name));if(loading.has(name))return loading.get(name);const pending=fetch(clips[name]).then(r=>{if(!r.ok)throw new Error('Audio unavailable');return r.arrayBuffer();}).then(data=>context.decodeAudioData(data)).then(decoded=>{buffers.set(name,decoded);loading.delete(name);return decoded;},error=>{loading.delete(name);throw error;});loading.set(name,pending);return pending;}
 function unlock(){if(!enabled||document.hidden)return;try{if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context=new Audio();master=context.createGain();master.gain.value=.3;master.connect(context.destination);}if(context.state==='suspended'||context.state==='interrupted')context.resume().catch(()=>{});for(const name of Object.keys(clips))buffer(name).catch(()=>{});}catch{}}
 function tone(frequency,end,duration,delay=0,volume=.2,type='sine'){
  if(voices.size>=20)return;const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime+delay;
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);oscillator.frequency.exponentialRampToValueAtTime(Math.max(25,end),at+duration);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.006);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  oscillator.connect(gain);gain.connect(master);voices.add(oscillator);oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(at);oscillator.stop(at+duration+.02);
 }
 async function result(name){const ticket=epoch;try{const decoded=await buffer(name);if(ticket!==epoch||!enabled||document.hidden||context.state!=='running'||voices.size>=20)return;const voice=context.createBufferSource(),gain=context.createGain();voice.buffer=decoded;voice.loop=false;gain.gain.value=name==='damage'?.4:.42;voice.connect(gain);gain.connect(context.destination);voices.add(voice);voice.onended=()=>{voices.delete(voice);voice.disconnect();gain.disconnect();};voice.start();}catch{/* An unavailable clip must not interrupt gameplay. */}}
 function play(name){if(!enabled||document.hidden||!context||context.state!=='running')return;const now=context.currentTime,spacing=name==='shoot'?.06:name==='hit'?.045:name==='damage'?.15:0;if(spacing&&now-(recent.get(name)??-Infinity)<spacing)return;recent.set(name,now);if(clips[name]){result(name);return;}
  try{switch(name){
   case 'shoot':tone(650,130,.09,0,.13,'triangle');break;
   case 'hit':tone(170,45,.065,0,.18,'triangle');break;
   case 'upgrade':tone(440,660,.11);tone(660,880,.15,.1);break;
   case 'repair':tone(300,450,.12);tone(450,600,.18,.12);break;
   case 'wave':tone(440,440,.14,0,.12);tone(660,660,.19,.16,.12);break;
   case 'boss':tone(110,80,.28,0,.17,'triangle');tone(110,65,.4,.32,.17,'triangle');break;
   default:tone(540,720,.055,0,.09,'sine');
  }}catch{}
 }
 function toggle(){enabled=!enabled;try{localStorage.setItem('cat-defense-sound',enabled?'on':'off');}catch{}if(enabled)unlock();else stop();return enabled;}
 document.addEventListener('pointerdown',unlock,{capture:true,passive:true});document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();if(context?.state==='running')context.suspend().catch(()=>{});}});
 return{play,stop,unlock,toggle,get enabled(){return enabled;}};
})();
