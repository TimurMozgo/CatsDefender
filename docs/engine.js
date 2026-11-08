'use strict';
window.CampaignEngine=(()=>{
 const STAGES=[{name:'Квартал',enemies:[1,4,2]},{name:'Промзона',enemies:[3,5,6]},{name:'Тоннель',enemies:[1,8,7]},{name:'Магистраль',enemies:[3,4,6]},{name:'Парк',enemies:[1,8,2]}];
 const ROLES=['Стрелок','Скорострел','Тяжёлый'];
 const SKINS=Array.from({length:15},(_,i)=>{const tier=Math.floor(i/3),role=i%3;return{id:i+1,role,tier:tier+1,name:ROLES[role],price:[50,110,200,320,480][tier],damage:Math.round(20*1.8**tier*[1,.78,1.5][role]),reload:[.8,.5,1.1][role]};});
 const ENEMIES={1:'normal',2:'armored',3:'normal',4:'fast',5:'fast',6:'armored',7:'armored',8:'fast'};
 const CLASS_NAMES={normal:'Обычные',fast:'Быстрые',armored:'Бронированные',boss:'Босс'};
 function wavePlan(stage,wave){const total=6+wave*2,pool=STAGES[stage].enemies,fastLane=(stage+1)%3,armorLane=(stage+2)%3;return Array.from({length:total},(_,i)=>{const lane=i%3,boss=wave===5&&i===total-1;let kind='normal';if(wave===2&&lane===fastLane)kind='fast';if(wave===3&&lane===armorLane)kind='armored';if(wave>=4)kind=lane===fastLane?'fast':lane===armorLane?'armored':'normal';return{lane,boss,kind:boss?'boss':kind,type:boss?stage+1:pool[kind==='fast'?1:kind==='armored'?2:0]};});}
 function launchWave(g){if(g.state!=='playing'||!g.preparing||g.wave>=5)return false;g.wave++;g.plan=wavePlan(g.stage,g.wave);g.preparing=false;g.spawned=0;g.spawnClock=.5;return true;}
 function swap(g,a,b){if(g.state!=='playing'||!Number.isInteger(a)||!Number.isInteger(b)||a<0||a>5||b<0||b>5||a===b)return false;[g.units[a],g.units[b]]=[g.units[b],g.units[a]];return true;}
 function impact(damage,role,kind){return Math.max(1,Math.round(damage*(kind==='armored'?(role===2?1.5:.4):kind==='fast'?(role===1?1.5:role===2?.7:1):1)));}
 const fresh=()=>({version:3,stage:0,coins:180,score:0,units:[{type:1},null,null,null,null,null],complete:false});
 const clone=value=>JSON.parse(JSON.stringify(value));
 function validRun(r){return r&&r.version===3&&Number.isInteger(r.stage)&&r.stage>=0&&r.stage<5&&Number.isInteger(r.coins)&&r.coins>=0&&r.coins<=1000000&&Number.isFinite(r.score)&&r.score>=0&&Array.isArray(r.units)&&r.units.length===6&&r.units.every(u=>u===null||(Number.isInteger(u.type)&&u.type>=1&&u.type<=15&&SKINS[u.type-1].tier<=r.stage+1))&&typeof r.complete==='boolean';}
 function begin(run){const g=clone(run);Object.assign(g,{state:'playing',hp:100,wave:0,between:6,preparing:true,plan:[],spawned:0,spawnClock:0,enemies:[],bullets:[],dead:[],sparks:[],clock:0,nextId:1,nextGrowl:3,nextBark:0});g.units=g.units.map(u=>u?{...u,cool:.2,shoot:0}:null);return g;}
 function purchase(g,slot,type){if(g.state!=='playing'||!Number.isInteger(slot)||slot<0||slot>5)return false;const skin=SKINS[type-1];if(!skin||skin.tier>g.stage+1||g.coins<skin.price||g.units[slot]?.type===type)return false;g.coins-=skin.price;g.units[slot]={type,cool:.15,shoot:0};return true;}
 function repairCost(g){return 40+g.stage*15;}
 function repair(g){const price=repairCost(g);if(g.state!=='playing'||g.hp>=100||g.coins<price)return false;g.coins-=price;g.hp=Math.min(100,g.hp+35);return true;}
 function checkpoint(g){return{version:3,stage:Math.min(4,g.stage+1),coins:g.coins,score:g.score,units:g.units.map(u=>u?{type:u.type}:null),complete:g.stage===4};}
 function step(g,dt,emit=()=>{}){
  if(g.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;g.clock+=dt;
  if(g.preparing){g.between=Math.max(0,g.between-dt);if(g.between===0&&launchWave(g))emit('wave',g.wave);return;}
  const total=g.plan.length;g.spawnClock-=dt;
  if(g.spawned<total&&g.spawnClock<=0){const {boss,lane,type,kind}=g.plan[g.spawned],hp=Math.round(80*1.55**g.stage*(1+.16*(g.wave-1))*(boss?3:kind==='fast'?.72:kind==='armored'?1.5:1));g.enemies.push({id:g.nextId++,type,kind,boss,lane,x:1.08,hp,maxHp:hp,speed:(.055+g.stage*.004)*(boss?.7:kind==='fast'?2.2:kind==='armored'?.8:1),attack:0,t:0,flash:0});g.spawned++;g.spawnClock=Math.max(.65,1.6-g.stage*.12-g.wave*.06);if(boss)emit('boss');}
  g.units.forEach((u,slot)=>{if(!u)return;u.cool-=dt;u.shoot=Math.max(0,u.shoot-dt);const lane=Math.floor(slot/2);if(u.cool>0||!g.enemies.some(e=>e.lane===lane&&e.hp>0&&e.x<1))return;const skin=SKINS[u.type-1];u.cool=skin.reload;u.shoot=.32;g.bullets.push({x:slot%2?.25:.14,lane,role:skin.role,damage:skin.damage});emit('shoot',skin.role);});
  for(const b of g.bullets){const prev=b.x;b.x+=dt*1.15;const target=g.enemies.filter(e=>e.lane===b.lane&&e.hp>0&&e.x>=prev-.035&&e.x<=b.x+.035).sort((a,b)=>a.x-b.x)[0];if(target){const dealt=impact(b.damage,b.role,target.kind);target.hp-=dealt;target.flash=.09;b.x=2;g.sparks.push({x:target.x,lane:b.lane,life:.35,text:'−'+dealt});emit('hit',target.kind);}}
  g.bullets=g.bullets.filter(b=>b.x<1.12);
  for(const e of g.enemies){e.t+=dt;e.flash=Math.max(0,e.flash-dt);if(e.hp<=0){const reward=e.boss?25+g.stage*10:3+g.stage*2;g.coins+=reward;g.score+=e.boss?100:10;g.dead.push({...e,life:.55});g.sparks.push({x:e.x,lane:e.lane,life:.6,text:'+'+reward,gold:true});continue;}if(e.x>.36){e.x=Math.max(.36,e.x-e.speed*dt);if(e.x<.9&&g.clock>=g.nextGrowl){g.nextGrowl=g.clock+9;emit('growl');}}else{e.attack+=dt;if(e.attack>=.8){e.attack=0;g.hp=Math.max(0,g.hp-(6+g.stage*2+(e.boss?8:0)));emit('damage');if(g.clock>=g.nextBark){g.nextBark=g.clock+4;emit('bark');}}}}
  g.enemies=g.enemies.filter(e=>e.hp>0);for(const e of g.dead)e.life-=dt;g.dead=g.dead.filter(e=>e.life>0);for(const e of g.sparks)e.life-=dt;g.sparks=g.sparks.filter(e=>e.life>0);
  if(g.hp<=0){g.state='lost';emit('lost');return;}
  if(g.spawned===total&&!g.enemies.length){if(g.wave===5){g.coins+=40+g.stage*10;g.score+=Math.ceil(g.hp)*2;g.state='won';emit('won');}else{g.coins+=10;g.preparing=true;g.between=4;emit('clear');}}
 }
 return{STAGES,SKINS,ENEMIES,CLASS_NAMES,wavePlan,launchWave,swap,impact,fresh,clone,validRun,begin,purchase,repair,repairCost,checkpoint,step};
})();



