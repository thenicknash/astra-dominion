export const VERSION = 1;
export const SHIPS = {
  aegis: { name: 'Aegis frigate', role: 'Frontline', hp: 115, attack: 30, range: 2, cost: 150, alloy: 20, glyph: '◆', skill: 'Solar lance', skillMultiplier: 2.5, description: 'Screens ships behind it. Solar lance deals 250% damage. Draw Fire redirects nearby enemies.', color: '#b9d9d7' },
  spear: { name: 'Seraph lancer', role: 'Long range', hp: 72, attack: 39, range: 4, cost: 210, alloy: 35, glyph: '✦', skill: 'Piercing ray', skillMultiplier: 2.3, description: 'Piercing ray deals 230% damage and bypasses guard and formation screening; shields still absorb damage.', color: '#e9ce8e' },
  mend: { name: 'Halo tender', role: 'Support', hp: 90, attack: 22, range: 2, cost: 180, alloy: 25, glyph: '❖', skill: 'Restoration field', description: 'Restores 38 hull to every friendly ship within 3 tiles.', color: '#9fcbbe' },
  crown: { name: 'Crown cruiser', role: 'Heavy', hp: 165, attack: 42, range: 3, cost: 310, alloy: 65, glyph: '⬙', skill: 'Radiant aegis', description: 'Screens ships behind it and can Draw Fire. Radiant aegis adds 25 shielding to your entire fleet.', color: '#c5bedc' }
};
export const SCREEN_TYPES = ['aegis','crown'];
export const SCREEN_SHARE = .5;
export const BEACON_RADIUS = 3;
export const BUILDINGS = {
  trade: { name: 'Trade spire', icon: '◈', cost: 160, alloy: 20, description: '+80 credits after each operation.', max: 3 },
  foundry: { name: 'Stellar foundry', icon: '⬡', cost: 130, alloy: 15, description: '+25 alloys after each operation.', max: 3 },
  shield: { name: 'Aegis network', icon: '◇', cost: 140, alloy: 35, description: '+15 starting shields for every ship.', max: 3 },
  dock: { name: 'Orbital drydock', icon: '▱', cost: 200, alloy: 40, description: '+2 fleet capacity; recruits cost 8% less.', max: 2 },
  arsenal: { name: 'Photon arsenal', icon: '✧', cost: 190, alloy: 45, description: '+15% damage to all fleet weapons.', max: 3 },
  reactor: { name: 'Helios reactor', icon: '☼', cost: 150, alloy: 30, description: '+1 command energy each combat round.', max: 2 }
};
export const SECTORS = [
  { name: 'The Helios Gate', region: 'AURELIAN FRONTIER', subtitle: 'Hold the gateway. Give the dawn a fighting chance.', enemies: ['aegis', 'aegis', 'spear'], reward: 220 },
  { name: 'The Ivory Belt', region: 'MINING COLONIES', subtitle: 'Reclaim the foundries beyond the shattered moons.', enemies: ['aegis', 'spear', 'mend', 'aegis'], reward: 270 },
  { name: 'Meridian Crossing', region: 'IMPERIAL TRADE ROUTE', subtitle: 'Open the corridor. The outer colonies are counting on you.', enemies: ['aegis', 'spear', 'spear', 'crown'], reward: 320 },
  { name: 'The Silent Basilica', region: 'LOST ORBITAL SANCTUM', subtitle: 'An ancient defense array stirs beneath the stars.', enemies: ['crown', 'aegis', 'mend', 'spear', 'aegis'], reward: 370 },
  { name: 'Eclipse Anchorage', region: 'HOSTILE FLEET YARDS', subtitle: 'Break their shipyards before the armada awakens.', enemies: ['crown', 'crown', 'spear', 'mend', 'aegis'], reward: 420 },
  { name: 'The Last Sun', region: 'DOMINION CORE', subtitle: 'One final stand. A thousand worlds behind you.', enemies: ['crown', 'crown', 'spear', 'spear', 'mend', 'aegis'], reward: 600 }
];
export const distance = (a,b) => Math.abs(a.row-b.row)+Math.abs(a.col-b.col);
const clone = x => JSON.parse(JSON.stringify(x));
export class Game {
  constructor(saved) {
    this.state = saved ? clone(saved) : {
      version: VERSION, phase: 'prep', sector: 0, credits: 520, alloy: 135, integrity: 100, nextId: 4,
      buildings: Object.fromEntries(Object.keys(BUILDINGS).map(k=>[k,0])),
      fleet: [{id:1,type:'aegis',row:1,col:1,kills:0},{id:2,type:'spear',row:0,col:0,kills:0},{id:3,type:'mend',row:2,col:0,kills:0}],
      units: [], round: 1, energy: 3, turn: 'player', log: ['Admiral, the Helios Gate is yours to defend.'], stats: { victories:0, kills:0, losses:0 }, result:null
    };
    // Additive migration: existing v1 campaigns keep their fleet, resources, and battle state.
    this.s.units.forEach(u=>{u.taunting??=false;u.tauntCooldown??=0;});
  }
  get s() { return this.state; }
  get capacity() { return 6 + this.s.buildings.dock * 2; }
  get income() { return {credits: 160+80*this.s.buildings.trade, alloy:40+25*this.s.buildings.foundry}; }
  get deployed() { return this.s.fleet.filter(u=>u.row!==null); }
  get allies() { return this.s.units.filter(u=>u.side==='ally'&&u.hp>0); }
  get enemies() { return this.s.units.filter(u=>u.side==='enemy'&&u.hp>0); }
  get sector() { return SECTORS[this.s.sector]; }
  log(message) { this.s.log.unshift(message); this.s.log=this.s.log.slice(0,35); }
  price(type) { return Math.round(SHIPS[type].cost*(1-this.s.buildings.dock*.08)); }
  recruit(type) {
    if(this.s.phase!=='prep') return 'Recruitment is available during preparation.';
    if(!SHIPS[type]) return 'Unknown ship class.';
    if(this.s.fleet.length>=this.capacity) return 'Fleet capacity reached. Upgrade the orbital drydock.';
    const cost=this.price(type), alloy=SHIPS[type].alloy;
    if(this.s.credits<cost||this.s.alloy<alloy) return 'Insufficient credits or alloys.';
    this.s.credits-=cost; this.s.alloy-=alloy;
    const unit={id:this.s.nextId++,type,row:null,col:null,kills:0}; this.s.fleet.push(unit);
    this.log(`${SHIPS[type].name} commissioned. Assign it to a deployment tile.`); return null;
  }
  build(type) {
    if(this.s.phase!=='prep') return 'Construction is available during preparation.';
    const b=BUILDINGS[type], lv=this.s.buildings[type]; if(!b) return 'Unknown structure.';
    if(lv>=b.max) return 'Already at maximum level.';
    const cost=b.cost+lv*70, alloy=b.alloy+lv*15;
    if(this.s.credits<cost||this.s.alloy<alloy) return 'Insufficient credits or alloys.';
    this.s.credits-=cost; this.s.alloy-=alloy; this.s.buildings[type]++;
    this.log(`${b.name} upgraded to level ${lv+1}.`); return null;
  }
  repair() {
    if(this.s.phase!=='prep') return 'Repairs are available during preparation.';
    if(this.s.integrity===100) return 'Citadel hull is already at full integrity.';
    if(this.s.credits<90||this.s.alloy<20) return 'Repairs require 90 credits and 20 alloys.';
    this.s.credits-=90; this.s.alloy-=20; this.s.integrity=Math.min(100,this.s.integrity+30); this.log('Citadel restored by 30 integrity.'); return null;
  }
  deploy(id,row,col) {
    if(this.s.phase!=='prep') return 'Deployment is locked during battle.';
    if(row<0||row>2||col<0||col>2) return 'Deploy within the three highlighted friendly columns.';
    const u=this.s.fleet.find(x=>x.id===id); if(!u) return 'Select a ship from your fleet.';
    const occupied=this.s.fleet.find(x=>x.row===row&&x.col===col&&x.id!==id);
    if(occupied) {occupied.row=u.row;occupied.col=u.col;}
    u.row=row;u.col=col;return null;
  }
  reserve(id) { if(this.s.phase!=='prep') return; const u=this.s.fleet.find(x=>x.id===id); if(u) {u.row=null;u.col=null;} }
  autoDeploy() {
    if(this.s.phase!=='prep') return;
    this.s.fleet.forEach(u=>{u.row=null;u.col=null;});
    const lanes=[1,0,2], screens=this.s.fleet.filter(u=>SCREEN_TYPES.includes(u.type)).slice(0,3);
    screens.forEach((u,i)=>{u.row=lanes[i];u.col=2;});
    const cells=[...screens.map(u=>[u.row,1]),...screens.map(u=>[u.row,0]),...lanes.flatMap(row=>[[row,2],[row,1],[row,0]])];
    for(const u of this.s.fleet.filter(u=>!screens.includes(u))){
      const cell=cells.find(([row,col])=>!this.deployed.some(x=>x.row===row&&x.col===col));
      if(cell)[u.row,u.col]=cell;
    }
  }
  makeUnit(u,side) {
    const spec=SHIPS[u.type], veteran=side==='ally'?Math.floor((u.kills||0)/2):0;
    const scale=side==='enemy'?.72+this.s.sector*.055:1;
    const maxHp=Math.round(spec.hp*scale)+veteran*7;
    return {...u,side,maxHp,hp:maxHp,attack:Math.round(spec.attack*(side==='ally'?1+.15*this.s.buildings.arsenal:scale)),range:spec.range,shield:side==='ally'?15*this.s.buildings.shield:0,ap:2,guard:false,cooldown:0,taunting:false,tauntCooldown:0};
  }
  startBattle() {
    if(this.s.phase!=='prep') return 'An operation is already underway.';
    if(!this.deployed.length) return 'Deploy at least one ship before launching.';
    this.s.units=this.deployed.map(u=>this.makeUnit(u,'ally'));
    this.sector.enemies.forEach((type,i)=>this.s.units.push(this.makeUnit({id:`e${i}`,type,row:i%3,col:i<3?5:6,kills:0},'enemy')));
    this.s.phase='battle';this.s.turn='player';this.s.round=1;this.s.energy=3+this.s.buildings.reactor;
    this.log('Engagement authorized. Select a ship, then a target or adjacent tile.');return null;
  }
  canAct(id) { const u=this.s.units.find(x=>x.id===id); return this.s.phase==='battle'&&this.s.turn==='player'&&u?.hp>0&&u.side==='ally'?u:null; }
  move(id,row,col) {
    const u=this.canAct(id); if(!u) return 'Select an active friendly ship.';
    if(u.ap<1) return 'This ship has no actions remaining.';
    if(row<0||row>2||col<0||col>6||distance(u,{row,col})!==1) return 'Move one tile horizontally or vertically.';
    if(this.s.units.some(x=>x.hp>0&&x.row===row&&x.col===col)) return 'That tile is occupied.';
    u.row=row;u.col=col;u.ap--;return null;
  }
  screenFor(target,attacker=null,units=this.s.units) {
    if(!target||(target.hp!==undefined&&target.hp<=0)||target.row===null)return null;
    // The fleets face each other. A flank shot from another lane bypasses the screen.
    const forward=target.side==='enemy'?-1:1;
    if(attacker&&(attacker.side===target.side||attacker.row!==target.row))return null;
    return units.filter(u=>u.id!==target.id&&u.side===target.side&&(u.hp===undefined||u.hp>0)&&SCREEN_TYPES.includes(u.type)&&u.row===target.row)
      .filter(u=>{const ahead=(u.col-target.col)*forward;return ahead>=1&&ahead<=2&&(!attacker||(attacker.col-u.col)*forward>0);})
      .sort((a,b)=>Math.abs(a.col-target.col)-Math.abs(b.col-target.col))[0]||null;
  }
  previewDamage(attacker,target,power,ignoreGuard=false,ignoreScreen=false) {
    const protector=ignoreScreen?null:this.screenFor(target,attacker);
    const intercepted=protector?Math.round(power*SCREEN_SHARE):0;
    return {
      targetId:target.id, protectorId:protector?.id??null,
      targetDamage:Math.round((power-intercepted)*(target.guard && !ignoreGuard ? .55 : 1)),
      protectorDamage:protector?Math.round(intercepted*(protector.guard ? .55 : 1)):0
    };
  }
  applyDamage(attacker,target,amount) {
    const absorbed=Math.min(target.shield,amount);target.shield-=absorbed; target.hp=Math.max(0,target.hp-(amount-absorbed));
    if(target.hp===0) {
      attacker.kills=(attacker.kills||0)+1;
      if(attacker.side==='ally') this.s.stats.kills++;
      this.log(`${SHIPS[target.type].name} ${target.side==='enemy'?'neutralized':'lost'}.`);
    }
  }
  damage(attacker,target,power,ignoreGuard=false,ignoreScreen=false) {
    const result=this.previewDamage(attacker,target,power,ignoreGuard,ignoreScreen);
    if(result.protectorId!==null)this.applyDamage(attacker,this.s.units.find(u=>u.id===result.protectorId),result.protectorDamage);
    // Resolve once: redirected damage never chains through another screen.
    this.applyDamage(attacker,target,result.targetDamage);
    return result;
  }
  describeHit(attacker,target,result,prefix='') {
    const protector=this.s.units.find(u=>u.id===result.protectorId);
    this.log(`${prefix}${SHIPS[attacker.type].name} hits ${SHIPS[target.type].name} for ${result.targetDamage}${protector?`; ${SHIPS[protector.type].name} intercepts ${result.protectorDamage}`:''}.`);
  }
  attack(id,targetId,skill=false) {
    const u=this.canAct(id), t=this.s.units.find(x=>x.id===targetId&&x.side==='enemy'&&x.hp>0);
    if(!u||!t) return 'Select an enemy target.';
    if(u.ap<1) return 'This ship has no actions remaining.';
    if(distance(u,t)>u.range) return `Target outside weapon range (${u.range} tiles).`;
    if(skill&&(u.ap<2||this.s.energy<1||u.cooldown>0)) return 'Ability needs 2 actions, 1 energy, and no cooldown.';
    if(skill&&!['aegis','spear'].includes(u.type)) return 'Use the support ability button.';
    const power=Math.round(u.attack*(skill?SHIPS[u.type].skillMultiplier:1));
    const result=this.damage(u,t,power,skill&&u.type==='spear',skill&&u.type==='spear');
    u.ap-=skill?2:1;if(skill){this.s.energy--;u.cooldown=2;}
    this.describeHit(u,t,result,skill?`${SHIPS[u.type].skill}: `:'');
    this.resolve();return null;
  }
  support(id) {
    const u=this.canAct(id);if(!u||!['mend','crown'].includes(u.type)) return 'Select a support ship.';
    if(u.ap<2||this.s.energy<1||u.cooldown>0) return 'Ability needs 2 actions, 1 energy, and no cooldown.';
    if(u.type==='mend')this.allies.filter(x=>distance(u,x)<=3).forEach(x=>x.hp=Math.min(x.maxHp,x.hp+38));
    else this.allies.forEach(x=>x.shield+=25);
    u.ap-=2;u.cooldown=2;this.s.energy--;this.log(`${SHIPS[u.type].skill} activated.`);return null;
  }
  guard(id) {const u=this.canAct(id);if(!u||u.ap<1) return 'Select a ship with an action remaining.';u.guard=true;u.ap=0;this.log(`${SHIPS[u.type].name} braces: incoming damage reduced by 45%.`);return null;}
  drawFire(id) {
    const u=this.canAct(id);
    if(!u||!SCREEN_TYPES.includes(u.type))return 'Only an active Aegis or Crown can draw fire.';
    if(u.ap<1||this.s.energy<1||u.tauntCooldown>0)return 'Draw Fire needs 1 action, 1 energy, and no beacon cooldown.';
    u.ap--;this.s.energy--;u.taunting=true;u.tauntCooldown=2;
    this.log(`${SHIPS[u.type].name} activates Draw Fire. Reachable enemies within 3 tiles will prioritize it this enemy phase.`);return null;
  }
  enemyPlan(u) {
    if(!u||u.hp<=0||!this.allies.length)return null;
    const adjacent=[{row:u.row,col:u.col-1},{row:u.row-1,col:u.col},{row:u.row+1,col:u.col},{row:u.row,col:u.col+1}]
      .filter(p=>p.row>=0&&p.row<3&&p.col>=0&&p.col<7&&!this.s.units.some(x=>x.hp>0&&x.row===p.row&&x.col===p.col));
    const locations=[{row:u.row,col:u.col},...adjacent];
    const beacons=this.allies.filter(a=>a.taunting&&distance(u,a)<=BEACON_RADIUS&&locations.some(p=>distance(p,a)<=u.range))
      .sort((a,b)=>distance(u,a)-distance(u,b)||a.id-b.id);
    if(beacons.length){
      const target=beacons[0], spot=distance(u,target)<=u.range?locations[0]:adjacent.find(p=>distance(p,target)<=u.range);
      return {...spot,targetId:target.id,drawn:true};
    }
    const chooseTarget=spot=>this.allies.filter(a=>distance(spot,a)<=u.range)
      .sort((a,b)=>(a.hp+a.shield)-(b.hp+b.shield)||distance(spot,a)-distance(spot,b)||a.id-b.id)[0];
    const immediate=chooseTarget(u);
    if(immediate)return {row:u.row,col:u.col,targetId:immediate.id,drawn:false};
    const nearest=[...this.allies].sort((a,b)=>distance(u,a)-distance(u,b)||a.hp-b.hp)[0];
    const step=adjacent.sort((a,b)=>distance(a,nearest)-distance(b,nearest))[0];
    const spot=step&&distance(step,nearest)<distance(u,nearest)?step:locations[0];
    return {...spot,targetId:chooseTarget(spot)?.id??null,drawn:false};
  }
  enemyStep(id) {
    if(this.s.phase!=='battle') return null;
    const u=this.enemies.find(x=>x.id===id);if(!u)return null;
    const plan=this.enemyPlan(u);if(!plan){this.resolve();return null;}
    u.row=plan.row;u.col=plan.col;
    const target=this.allies.find(a=>a.id===plan.targetId);
    if(target){
      if(plan.drawn)this.log(`Draw Fire redirects hostile ${SHIPS[u.type].name} toward ${SHIPS[target.type].name}.`);
      const result=this.damage(u,target,u.attack);this.describeHit(u,target,result,'Hostile ');this.resolve();
      return {from:u.id,to:target.id,protector:result.protectorId};
    }
    return {move:u.id};
  }
  beginEnemyTurn() {if(this.s.phase!=='battle'||this.s.turn!=='player')return false;this.s.turn='enemy';return true;}
  nextRound() {
    if(this.s.phase!=='battle')return;
    this.s.round++;if(this.s.round>12){this.finish(false,'The enemy broke through after 12 rounds.');return;}
    this.s.turn='player';this.s.energy=3+this.s.buildings.reactor;
    this.allies.forEach(u=>{u.ap=2;u.guard=false;u.taunting=false;u.cooldown=Math.max(0,u.cooldown-1);u.tauntCooldown=Math.max(0,u.tauntCooldown-1);});this.log(`Round ${this.s.round}. Command energy replenished.`);
  }
  resolve() {if(this.s.phase!=='battle')return;if(!this.enemies.length)this.finish(true);else if(!this.allies.length)this.finish(false);}
  retreat() {if(this.s.phase!=='battle'||this.s.turn!=='player')return;this.finish(false,'The fleet withdrew to the citadel.');}
  finish(won,reason='') {
    const deployedIds=new Set(this.s.units.filter(u=>u.side==='ally').map(u=>u.id));
    const alive=this.s.units.filter(u=>u.side==='ally'&&u.hp>0);const aliveIds=new Set(alive.map(u=>u.id));
    const lost=this.s.fleet.filter(u=>deployedIds.has(u.id)&&!aliveIds.has(u.id)).length;
    this.s.fleet=this.s.fleet.filter(u=>!deployedIds.has(u.id)||aliveIds.has(u.id));
    this.s.fleet.forEach(u=>{const survivor=alive.find(x=>x.id===u.id);if(survivor)u.kills=survivor.kills;});
    const income=this.income, reward=won?this.sector.reward:60;
    this.s.credits+=income.credits+reward;this.s.alloy+=income.alloy+(won?25:10);
    this.s.stats.losses+=lost;if(won)this.s.stats.victories++;else this.s.integrity=Math.max(0,this.s.integrity-18-this.enemies.length*4);
    this.s.result={won,lost,credits:income.credits+reward,alloy:income.alloy+(won?25:10),reason,choice:false};
    this.s.phase=this.s.integrity<=0?'defeat':won&&this.s.sector===5?'complete':'result';
    this.s.turn='player'; this.log(won?'Sector secured. The colonies are safe.':'Operation lost. Regroup and rebuild.');
  }
  continue(choice='credits') {
    if(this.s.phase!=='result')return;
    if(this.s.result.won){if(choice==='credits')this.s.credits+=120;else if(choice==='alloy')this.s.alloy+=55;else this.s.integrity=Math.min(100,this.s.integrity+25);this.s.sector++;}
    if(!this.s.fleet.length){this.s.fleet.push({id:this.s.nextId++,type:'aegis',row:1,col:1,kills:0});this.log('Emergency frigate dispatched by the admiralty.');}
    this.s.phase='prep';this.s.units=[];this.s.result=null;this.s.round=1;this.autoDeploy();
  }
  serialize(){return JSON.stringify(this.s);}
  static restore(text) {
    try {
      const s=JSON.parse(text), number=(v,min=0,max=1000000)=>Number.isFinite(v)&&v>=min&&v<=max;
      const integer=(v,min,max)=>Number.isInteger(v)&&number(v,min,max);
      if(!s||s.version!==VERSION||!['prep','battle','result','complete','defeat'].includes(s.phase)||!['player','enemy'].includes(s.turn))return null;
      if(!integer(s.sector,0,5)||!integer(s.round,1,13)||!integer(s.energy,0,5)||!integer(s.nextId,1,1000000)||!number(s.integrity,0,100)||!number(s.credits)||!number(s.alloy))return null;
      if(!s.buildings||Object.entries(BUILDINGS).some(([k,b])=>!integer(s.buildings[k],0,b.max)))return null;
      if(!s.stats||['victories','kills','losses'].some(k=>!integer(s.stats[k],0,1000000))||!Array.isArray(s.log)||s.log.length>35||s.log.some(x=>typeof x!=='string'||x.length>500))return null;
      if(!Array.isArray(s.fleet)||s.fleet.length>10||s.fleet.some(u=>!u||!Object.hasOwn(SHIPS,u.type)||!integer(u.id,1,s.nextId-1)||!integer(u.kills,0,1000000)||!(u.row===null&&u.col===null||integer(u.row,0,2)&&integer(u.col,0,2))))return null;
      if(new Set(s.fleet.map(u=>u.id)).size!==s.fleet.length)return null;
      const deployed=s.fleet.filter(u=>u.row!==null);if(new Set(deployed.map(u=>`${u.row},${u.col}`)).size!==deployed.length)return null;
      if(!Array.isArray(s.units)||s.units.length>15||s.units.some(u=>!u||!Object.hasOwn(SHIPS,u.type)||!['ally','enemy'].includes(u.side)||!integer(u.row,0,2)||!integer(u.col,0,6)||!number(u.maxHp,1)||!number(u.hp,0,u.maxHp)||!number(u.attack,1)||!integer(u.range,1,4)||!integer(u.ap,0,2)||!integer(u.cooldown,0,2)||!number(u.shield)||!integer(u.kills,0,1000000)))return null;
      if(s.units.some(u=>(u.taunting!==undefined&&typeof u.taunting!=='boolean')||(u.tauntCooldown!==undefined&&!integer(u.tauntCooldown,0,2))))return null;
      if(s.phase==='battle'&&(!s.units.some(u=>u.side==='ally'&&u.hp>0)||!s.units.some(u=>u.side==='enemy'&&u.hp>0)))return null;
      if(['result','complete','defeat'].includes(s.phase)&&(!s.result||typeof s.result.won!=='boolean'||!integer(s.result.lost,0,10)||!number(s.result.credits)||!number(s.result.alloy)||typeof s.result.reason!=='string'))return null;
      return new Game(s);
    } catch {return null;}
  }
}
