import test from 'node:test';
import assert from 'node:assert/strict';
import {Game, SHIPS, distance} from '../dist/engine.js';

test('recruitment spends resources once and respects capacity',()=>{
 const g=new Game(),before=g.s.credits;assert.equal(g.recruit('spear'),null);assert.equal(g.s.credits,before-210);assert.equal(g.s.fleet.at(-1).row,null);
 g.s.credits=5000;g.s.alloy=5000;while(g.s.fleet.length<g.capacity)assert.equal(g.recruit('aegis'),null);
 const credits=g.s.credits;assert.match(g.recruit('aegis'),/capacity/);assert.equal(g.s.credits,credits);
});
test('deployment swaps ships, rejects hostile tiles, and keeps reserves off the battlefield',()=>{
 const g=new Game();assert.equal(g.deploy(1,0,0),null);assert.deepEqual([g.s.fleet[1].row,g.s.fleet[1].col],[1,1]);
 assert.match(g.deploy(1,1,5),/highlighted/);g.reserve(3);g.startBattle();assert.equal(g.allies.length,2);
 assert.match(g.deploy(1,0,1),/locked/);
});
test('construction improves economy and defenses with real resource costs',()=>{
 const g=new Game();assert.equal(g.build('trade'),null);assert.equal(g.income.credits,240);assert.equal(g.build('shield'),null);
 g.startBattle();assert.ok(g.allies.every(u=>u.shield===15));assert.match(g.build('trade'),/preparation/);
});
test('movement, attack range, action points, and guard are enforced',()=>{
 const g=new Game();g.startBattle();const u=g.allies[0],e=g.enemies[0];
 assert.match(g.attack(u.id,e.id),/range/);assert.equal(g.move(u.id,1,2),null);assert.equal(u.ap,1);
 assert.match(g.move(u.id,1,4),/one tile/);assert.equal(g.guard(u.id),null);assert.equal(u.ap,0);
 assert.match(g.move(u.id,1,3),/no actions/);
 const hp=u.hp;g.damage(e,u,40);assert.equal(hp-u.hp,22);
});
test('abilities consume energy, heal correctly, and respect cooldown',()=>{
 const g=new Game();g.startBattle();const support=g.allies.find(u=>u.type==='mend');const a=g.allies[0];a.hp-=50;
 assert.equal(g.support(support.id),null);assert.equal(a.hp,a.maxHp-12);assert.equal(g.s.energy,2);assert.equal(support.ap,0);
 assert.match(g.support(support.id),/Ability needs/);g.nextRound();assert.equal(support.cooldown,1);assert.equal(g.s.energy,3);
 g.nextRound();assert.equal(support.cooldown,0);
});
test('victory pays income, preserves veterans, removes losses and advances exactly once',()=>{
 const g=new Game();g.startBattle();g.allies[2].hp=0;g.allies[0].kills=3;g.enemies.forEach(e=>e.hp=0);g.resolve();
 assert.equal(g.s.phase,'result');assert.equal(g.s.fleet.length,2);assert.equal(g.s.credits,900);assert.equal(g.s.result.lost,1);
 g.continue('alloy');assert.equal(g.s.sector,1);assert.equal(g.s.alloy,255);assert.equal(g.s.phase,'prep');
 g.continue();assert.equal(g.s.sector,1);g.startBattle();assert.equal(g.allies[0].maxHp,122);
});
test('retreat preserves surviving ships, damages citadel, and allows recovery',()=>{
 const g=new Game();g.startBattle();g.retreat();assert.equal(g.s.phase,'result');assert.equal(g.s.integrity,70);
 assert.equal(g.s.fleet.length,3);g.continue();assert.equal(g.s.sector,0);assert.equal(g.s.phase,'prep');
 assert.equal(g.repair(),null);assert.equal(g.s.integrity,100);
});
test('total fleet loss grants an emergency frigate unless the citadel falls',()=>{
 const g=new Game();g.startBattle();g.allies.forEach(u=>u.hp=0);g.resolve();g.continue();assert.equal(g.s.fleet.length,1);
 g.s.integrity=1;g.startBattle();g.retreat();assert.equal(g.s.phase,'defeat');
});
test('round limit and final victory produce terminal outcomes',()=>{
 const g=new Game();g.startBattle();g.s.round=12;g.nextRound();assert.equal(g.s.phase,'result');assert.equal(g.s.result.won,false);
 const final=new Game();final.s.sector=5;final.startBattle();final.enemies.forEach(u=>u.hp=0);final.resolve();assert.equal(final.s.phase,'complete');
});
test('save roundtrip preserves state and rejects malformed imports',()=>{
 const g=new Game();g.build('trade');const saved=Game.restore(g.serialize());assert.deepEqual(saved.s,g.s);
 assert.equal(Game.restore('{broken'),null);assert.equal(Game.restore('{}'),null);
 const s=JSON.parse(g.serialize());s.fleet[0].type='invalid';assert.equal(Game.restore(JSON.stringify(s)),null);
 const broken=JSON.parse(g.serialize());broken.phase='result';assert.equal(Game.restore(JSON.stringify(broken)),null);
 const battle=new Game();battle.startBattle();assert.deepEqual(Game.restore(battle.serialize()).s,battle.s);
 battle.enemies.forEach(e=>e.hp=0);battle.resolve();assert.deepEqual(Game.restore(battle.serialize()).s,battle.s);
});

function formation(){
 const g=new Game();g.startBattle();
 const tank=g.allies[0],rear=g.allies[1],healer=g.allies[2],enemy=g.enemies[2];
 Object.assign(tank,{row:1,col:2});Object.assign(rear,{row:1,col:0});Object.assign(healer,{row:2,col:0});
 Object.assign(enemy,{row:1,col:4});
 return {g,tank,rear,healer,enemy};
}

test('a frontline intercepts half of head-on damage and protection updates with movement',()=>{
 const {g,tank,rear,enemy}=formation();
 assert.equal(g.screenFor(rear,enemy).id,tank.id);
 const tankHp=tank.hp,rearHp=rear.hp;
 const result=g.damage(enemy,rear,40);
 assert.equal(result.protectorId,tank.id);assert.equal(tank.hp,tankHp-20);assert.equal(rear.hp,rearHp-20);
 assert.equal(g.move(tank.id,0,2),null);assert.equal(g.screenFor(rear,enemy),null);
});

test('flanks, rear attacks, distance gaps, and destroyed screens bypass interception',()=>{
 const {g,tank,rear,enemy}=formation();
 enemy.row=0;assert.equal(g.screenFor(rear,enemy),null);
 enemy.row=1;enemy.col=1;assert.equal(g.screenFor(rear,enemy),null);
 enemy.col=5;tank.col=3;assert.equal(g.screenFor(rear,enemy),null);
 tank.col=2;tank.hp=0;assert.equal(g.screenFor(rear,enemy),null);
});

test('screening mirrors for the enemy fleet and never chains or stacks',()=>{
 const {g,tank,rear,enemy}=formation();
 const extra=g.makeUnit({id:4,type:'crown',row:1,col:1,kills:0},'ally');g.s.units.push(extra);
 const frontHp=tank.hp,extraHp=extra.hp;g.damage(enemy,rear,40);
 assert.equal(tank.hp,frontHp);assert.equal(extra.hp,extraHp-20);assert.equal(rear.hp,rear.maxHp-20);
 const hostileScreen=g.enemies[0];Object.assign(hostileScreen,{row:0,col:4});Object.assign(enemy,{row:0,col:6});Object.assign(tank,{row:0,col:2});
 assert.equal(g.screenFor(enemy,tank).id,hostileScreen.id);
});

test('guard and shields mitigate each share separately; interception is previewed without mutation',()=>{
 const {g,tank,rear,enemy}=formation();tank.guard=true;tank.shield=5;rear.shield=8;
 const before=g.serialize(),preview=g.previewDamage(enemy,rear,40);
 assert.equal(g.serialize(),before);assert.equal(preview.targetDamage,20);assert.equal(preview.protectorDamage,11);
 const result=g.damage(enemy,rear,40);assert.deepEqual(result,preview);
 assert.equal(tank.hp,tank.maxHp-6);assert.equal(rear.hp,rear.maxHp-12);assert.equal(tank.shield,0);assert.equal(rear.shield,0);
});

test('both offensive abilities outperform two normal attacks at their action cost',()=>{
 for(const type of ['aegis','spear']){
  const {g,tank,enemy}=formation();tank.type=type;tank.attack=SHIPS[type].attack;tank.range=SHIPS[type].range;
  Object.assign(enemy,{row:1,col:3,hp:500,maxHp:500});
  const before=enemy.hp;assert.equal(g.attack(tank.id,enemy.id,true),null);
  assert.ok(before-enemy.hp>tank.attack*2);assert.equal(tank.ap,0);assert.equal(g.s.energy,2);assert.equal(tank.cooldown,2);
  tank.ap=2;assert.match(g.attack(tank.id,enemy.id,true),/Ability needs/);
 }
});

test('Piercing ray bypasses guard and screening but respects shields and range',()=>{
 const g=new Game();g.startBattle();const lancer=g.allies[1],front=g.enemies[0],rear=g.enemies[1];
 Object.assign(lancer,{row:0,col:2});Object.assign(front,{row:0,col:4});Object.assign(rear,{row:0,col:5,hp:250,maxHp:250,guard:true,shield:12});
 const hp=front.hp;assert.equal(g.screenFor(rear,lancer).id,front.id);
 assert.equal(g.attack(lancer.id,rear.id,true),null);assert.equal(front.hp,hp);assert.equal(rear.shield,0);
 assert.equal(rear.hp,250-(Math.round(39*2.3)-12));
});

test('a screen destroyed while intercepting stops protecting and awards the kill once',()=>{
 const {g,tank,rear,enemy}=formation();tank.hp=10;
 g.damage(enemy,rear,40);assert.equal(tank.hp,0);assert.equal(enemy.kills,1);assert.equal(g.screenFor(rear,enemy),null);
 const hp=rear.hp;g.damage(enemy,rear,20);assert.equal(rear.hp,hp-20);assert.equal(enemy.kills,1);
});

test('Draw Fire redirects a vulnerable target to the beacon and combines with Guard',()=>{
 const {g,tank,rear,enemy}=formation();Object.assign(tank,{row:0,col:2});Object.assign(rear,{row:1,col:2});
 assert.equal(g.enemyPlan(enemy).targetId,rear.id);
 assert.equal(g.drawFire(tank.id),null);assert.equal(tank.ap,1);assert.equal(g.s.energy,2);
 assert.equal(g.enemyPlan(enemy).targetId,tank.id);assert.equal(g.enemyPlan(enemy).drawn,true);
 const rearHp=rear.hp,tankHp=tank.hp;g.guard(tank.id);g.beginEnemyTurn();const effect=g.enemyStep(enemy.id);
 assert.equal(effect.to,tank.id);assert.equal(rear.hp,rearHp);assert.equal(tank.hp,tankHp-Math.round(enemy.attack*.55));
});

test('Draw Fire has limited reach, requires legal firing access, and handles competing beacons',()=>{
 const {g,tank,rear,enemy}=formation();Object.assign(tank,{row:0,col:2});Object.assign(rear,{row:1,col:2});g.drawFire(tank.id);
 enemy.col=6;assert.equal(g.enemyPlan(enemy).drawn,false);
 enemy.col=4;enemy.range=1;assert.equal(g.enemyPlan(enemy).drawn,false);
 enemy.range=4;
 const crown=g.makeUnit({id:4,type:'crown',row:1,col:3,kills:0},'ally');g.s.units.push(crown);g.drawFire(crown.id);
 assert.equal(g.enemyPlan(enemy).targetId,crown.id);
 crown.hp=0;assert.equal(g.enemyPlan(enemy).targetId,tank.id);
 tank.hp=0;assert.equal(g.enemyPlan(enemy).targetId,rear.id);assert.equal(g.enemyPlan(enemy).drawn,false);
});

test('a beacon can draw a short-range enemy into a legal firing tile',()=>{
 const {g,tank,enemy}=formation();Object.assign(tank,{row:1,col:1});Object.assign(enemy,{row:1,col:4,range:2});
 g.drawFire(tank.id);const plan=g.enemyPlan(enemy);assert.equal(plan.targetId,tank.id);assert.equal(plan.col,3);assert.equal(plan.drawn,true);
});

test('Draw Fire expires next round, has a separate cooldown, and rejects invalid activations',()=>{
 const {g,tank,rear}=formation();assert.match(g.drawFire(rear.id),/Only/);
 g.s.energy=0;assert.match(g.drawFire(tank.id),/needs/);g.s.energy=3;
 assert.equal(g.drawFire(tank.id),null);assert.equal(tank.cooldown,0);
 assert.match(g.drawFire(tank.id),/needs/);g.nextRound();assert.equal(tank.taunting,false);assert.equal(tank.tauntCooldown,1);
 assert.match(g.drawFire(tank.id),/needs/);g.nextRound();assert.equal(g.drawFire(tank.id),null);
});

test('new beacon state survives saves and old campaigns migrate without losing progress',()=>{
 const {g,tank}=formation();g.drawFire(tank.id);const saved=Game.restore(g.serialize());assert.deepEqual(saved.s,g.s);
 const legacy=JSON.parse(g.serialize());legacy.units.forEach(u=>{delete u.taunting;delete u.tauntCooldown;});
 const migrated=Game.restore(JSON.stringify(legacy));assert.ok(migrated);assert.equal(migrated.s.credits,g.s.credits);
 assert.deepEqual(migrated.s.fleet,g.s.fleet);assert.ok(migrated.s.units.every(u=>u.taunting===false&&u.tauntCooldown===0));
 legacy.units[0].tauntCooldown=-1;assert.equal(Game.restore(JSON.stringify(legacy)),null);
});

test('auto deployment forms a screened line and never overlaps units',()=>{
 const g=new Game();g.autoDeploy();g.startBattle();
 assert.equal(g.screenFor(g.allies[1]).id,g.allies[0].id);assert.equal(g.screenFor(g.allies[2]).id,g.allies[0].id);
 const large=new Game();large.s.credits=10000;large.s.alloy=10000;large.build('dock');large.build('dock');
 while(large.s.fleet.length<10)large.recruit(large.s.fleet.length%2?'crown':'spear');large.autoDeploy();
 assert.equal(large.deployed.length,9);assert.equal(new Set(large.deployed.map(u=>`${u.row},${u.col}`)).size,9);
});

// Exercise all six operations with a legal, deterministic commander and economic investment.
test('the full campaign can be completed using legal actions and upgrades',()=>{
 const g=new Game();g.recruit('spear');g.build('trade');
 let operations=0;
 while(g.s.phase!=='complete'&&operations<12){
  if(g.s.phase==='result')g.continue('credits');
  if(g.s.phase==='defeat')break;
  for(const type of ['shield','arsenal','dock'])g.build(type);
  while(g.s.fleet.length<Math.min(8,g.capacity)&&g.recruit(g.s.fleet.filter(u=>u.type==='spear').length<4?'spear':'crown')===null){}
  if(g.s.integrity<75)g.repair();g.autoDeploy();g.startBattle();operations++;
  for(let round=0;round<12&&g.s.phase==='battle';round++){
   for(const u of [...g.allies]){
    for(let action=0;action<2&&g.s.phase==='battle'&&u.hp>0&&u.ap>0;action++){
     const targets=g.enemies.filter(e=>distance(u,e)<=u.range).sort((a,b)=>a.hp-b.hp);
     if(targets.length){g.attack(u.id,targets[0].id);continue;}
     const target=[...g.enemies].sort((a,b)=>distance(u,a)-distance(u,b))[0];if(!target)break;
     const next=[{row:u.row,col:u.col+1},{row:u.row-1,col:u.col},{row:u.row+1,col:u.col},{row:u.row,col:u.col-1}].filter(p=>p.row>=0&&p.row<3&&p.col>=0&&p.col<7&&!g.s.units.some(x=>x.hp>0&&x.row===p.row&&x.col===p.col)).sort((a,b)=>distance(a,target)-distance(b,target))[0];
     if(next&&distance(next,target)<distance(u,target))g.move(u.id,next.row,next.col);else g.guard(u.id);
    }
   }
   if(g.beginEnemyTurn()){for(const e of [...g.enemies])g.enemyStep(e.id);g.nextRound();}
  }
 }
 assert.equal(g.s.phase,'complete',`Campaign ended in ${g.s.phase} at sector ${g.s.sector+1} after ${operations} operations.`);
 assert.equal(g.s.stats.victories,6);
});
