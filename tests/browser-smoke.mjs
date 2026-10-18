import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
let chromium;
try { ({chromium}=require('playwright')); }
catch { ({chromium}=require(process.env.PLAYWRIGHT_PACKAGE || 'C:/Users/theni/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
await mkdir(new URL('../screenshots/',import.meta.url),{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1});
const page=await context.newPage();const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
await page.locator('h1').filter({hasText:'The Helios Gate'}).waitFor();
await page.screenshot({path:new URL('../screenshots/command-deck.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
assert.equal(await page.locator('[data-cell]').count(),21);
async function checkStickyResources(label){
 await page.evaluate(()=>window.scrollTo(0,650));
 const position=await page.evaluate(()=>{
   const bar=document.querySelector('.topbar').getBoundingClientRect();
   const resources=document.querySelector('.resources').getBoundingClientRect();
   return {scrollY:window.scrollY,barTop:bar.top,resourceTop:resources.top,resourceBottom:resources.bottom,height:innerHeight};
 });
 assert.ok(position.scrollY>200,`${label}: page did not scroll`);
 assert.ok(Math.abs(position.barTop)<1,`${label}: navbar moved off screen`);
 assert.ok(position.resourceTop>=0&&position.resourceBottom<position.height,`${label}: resources are not visible`);
}
await checkStickyResources('Desktop');
await page.screenshot({path:new URL('../screenshots/sticky-resources-desktop.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
// Selecting a ship twice clears selection without changing its deployment.
for(const selector of ['[data-cell="1,1"]','[data-select="1"]']){
 await page.locator(selector).click();
 assert.equal(await page.locator('.cell.selected').count(),1);
 await page.locator(selector).click();
 assert.equal(await page.locator('.cell.selected,.roster-card.chosen').count(),0);
 assert.equal(await page.locator('[data-cell="1,1"]').getAttribute('data-unit'),'1');
}
// Undeployment remains a separate explicit command.
await page.locator('[data-select="1"]').click();
await page.locator('[data-action="reserve"]').click();
assert.equal(await page.locator('[data-cell="1,1"]').getAttribute('data-unit'),null);
await page.locator('[data-select="1"]').click();
await page.locator('[data-cell="1,1"]').click();
await page.locator('[data-cell="1,1"]').click();
assert.equal(await page.locator('.cell.selected,.roster-card.chosen').count(),0);
await page.locator('[data-recruit="spear"]').click();
await page.locator('[data-cell="0,2"]').click();
assert.equal(await page.locator('[data-cell="0,2"]').getAttribute('data-unit'),'4');
await page.locator('[data-tab="citadel"]').click();
await page.locator('[data-build="trade"]').click();
assert.match(await page.locator('.resources').textContent(),/\+240\/op/);
await page.locator('[data-tab="fleet"]').click();
await page.locator('[data-action="launch"]').click();
for(const selector of ['[data-cell="0,2"]','[data-select="4"]']){
 await page.locator(selector).click();
 assert.match(await page.locator('.battle-controls').textContent(),/2 ACTIONS/);
 await page.locator(selector).click();
 assert.equal(await page.locator('.cell.selected,.roster-card.chosen,.cell.reachable,.cell.targetable').count(),0);
}
await page.locator('[data-cell="0,2"]').click();
await page.locator('[data-action="skill"]').click();
await page.locator('[data-cell="0,2"]').click();
assert.equal(await page.locator('.cell.selected,.roster-card.chosen').count(),0);
assert.ok(!(await page.locator('.board-instructions').textContent()).includes('ABILITY ARMED'));
await page.locator('[data-cell="0,2"]').click();
await page.locator('[data-cell="0,5"]').click();
assert.match(await page.locator('.battle-controls').textContent(),/1 ACTIONS/);
await page.locator('[data-action="guard"]').click();
await page.waitForTimeout(400);
await page.screenshot({path:new URL('../screenshots/engagement.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
await page.locator('[data-action="end"]').click();
await page.waitForFunction(()=>document.querySelector('.phase-status').textContent.includes('ROUND 2')&&document.querySelector('.phase-status').textContent.includes('YOUR TURN'));
await page.reload({waitUntil:'networkidle'});
assert.match(await page.locator('.phase-status').textContent(),/ROUND 2/);
await page.locator('[data-action="retreat"]').click();
await page.locator('[data-action="confirm-retreat"]').click();
await page.locator('[data-continue="credits"]').click();
assert.match(await page.locator('h1').textContent(),/Helios/);
await page.locator('[data-action="settings"]').click();
await page.locator('[data-action="reset"]').click();
await page.locator('[data-action="new"]').click();
// Verify victory dialog, sector rewards, and progression through a reproducible near-win fixture.
// Exercise interception and beacon orders through the same controls the player uses.
await page.evaluate(async()=>{
 const {Game}=await import('/engine.js');const g=new Game();g.autoDeploy();g.startBattle();
 g.enemies.slice(0,2).forEach(e=>e.hp=0);Object.assign(g.enemies[0],{row:1,col:4});
 localStorage.setItem('astra-dominion-save-v1',g.serialize());
});
await page.reload({waitUntil:'networkidle'});
assert.equal(await page.locator('[data-unit="2"]').getAttribute('data-screen'),'1');
assert.equal(await page.locator('[data-unit="e2"]').getAttribute('data-intent'),'2');
await page.locator('[data-action="end"]').click();
await page.waitForFunction(()=>document.querySelector('.phase-status').textContent.includes('ROUND 2')&&document.querySelector('.phase-status').textContent.includes('YOUR TURN'));
const screenedSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('astra-dominion-save-v1')));
assert.equal(screenedSave.units.find(u=>u.id===1).hp,101);
assert.equal(screenedSave.units.find(u=>u.id===2).hp,58);
assert.ok(screenedSave.log.some(s=>s.includes('intercepts 14')));
await page.evaluate(async()=>{
 const {Game}=await import('/engine.js');const g=new Game();g.autoDeploy();g.startBattle();
 g.enemies.slice(0,2).forEach(e=>e.hp=0);Object.assign(g.enemies[0],{row:1,col:4});
 Object.assign(g.allies[0],{row:0,col:2});
 localStorage.setItem('astra-dominion-save-v1',g.serialize());
});
await page.reload({waitUntil:'networkidle'});
assert.equal(await page.locator('[data-unit="e2"]').getAttribute('data-intent'),'2');
await page.locator('[data-unit="1"]').click();
await page.locator('[data-action="draw-fire"]').click();
assert.equal(await page.locator('[data-unit="e2"]').getAttribute('data-intent'),'1');
assert.match(await page.locator('[data-unit="1"]').textContent(),/BEACON/);
assert.match(await page.locator('.combat-detail').textContent(),/75 damage \(two normal shots: 60\)/);
await page.locator('[data-action="guard"]').click();
await page.locator('.battlefield').scrollIntoViewIfNeeded();
await page.screenshot({path:new URL('../screenshots/draw-fire.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
await page.locator('[data-action="end"]').click();
await page.waitForFunction(()=>document.querySelector('.phase-status').textContent.includes('ROUND 2')&&document.querySelector('.phase-status').textContent.includes('YOUR TURN'));
const beaconSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('astra-dominion-save-v1')));
assert.equal(beaconSave.units.find(u=>u.id===1).hp,100);
assert.equal(beaconSave.units.find(u=>u.id===2).hp,72);
assert.equal(beaconSave.units.find(u=>u.id===1).taunting,false);
await page.setViewportSize({width:390,height:844});
await page.locator('[data-unit="1"]').click();
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'New ability controls overflow on mobile');
await page.screenshot({path:new URL('../screenshots/tactical-controls-mobile.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
await page.setViewportSize({width:1440,height:1100});
// The Piercing Ray button must deal its upgraded damage and bypass a visible screen.
await page.evaluate(async()=>{
 const {Game}=await import('/engine.js');const g=new Game();g.startBattle();
 Object.assign(g.allies[1],{row:0,col:2});
 Object.assign(g.enemies[0],{row:0,col:4});Object.assign(g.enemies[1],{row:0,col:5,hp:250,maxHp:250,guard:true,shield:12});
 localStorage.setItem('astra-dominion-save-v1',g.serialize());
});
await page.reload({waitUntil:'networkidle'});
assert.equal(await page.locator('[data-unit="e1"]').getAttribute('data-screen'),'e0');
await page.locator('[data-unit="2"]').click();
await page.locator('[data-action="skill"]').click();
assert.match(await page.locator('[data-unit="e1"]').getAttribute('title'),/90 damage to target/);
await page.locator('[data-unit="e1"]').click();
const piercingSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('astra-dominion-save-v1')));
assert.equal(piercingSave.units.find(u=>u.id==='e1').hp,172);
assert.equal(piercingSave.units.find(u=>u.id==='e0').hp,83);
await page.evaluate(async()=>{const {Game}=await import('/engine.js');const g=new Game();g.startBattle();g.enemies.slice(1).forEach(e=>e.hp=0);g.enemies[0].hp=1;g.allies[1].col=2;localStorage.setItem('astra-dominion-save-v1',g.serialize());});
await page.reload({waitUntil:'networkidle'});
await page.locator('[data-cell="0,2"]').click();
await page.locator('[data-cell="0,5"]').click();
await page.locator('#dialog-title').filter({hasText:'Sector secured.'}).waitFor();
await page.screenshot({path:new URL('../screenshots/sector-victory.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
await page.locator('[data-continue="alloy"]').click();
assert.match(await page.locator('h1').textContent(),/Ivory Belt/);
await page.locator('[data-action="settings"]').click();
await page.locator('[data-action="reset"]').click();
await page.locator('[data-action="new"]').click();
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:new URL('../screenshots/mobile-command.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile has horizontal overflow');
await checkStickyResources('Mobile');
await page.screenshot({path:new URL('../screenshots/sticky-resources-mobile.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
await page.locator('[data-cell="1,1"]').click();
await page.locator('[data-cell="1,1"]').click();
assert.equal(await page.locator('.cell.selected,.roster-card.chosen').count(),0);
assert.equal(await page.locator('[data-cell="1,1"]').getAttribute('data-unit'),'1');
await page.locator('[data-action="help"]').last().click();
await page.locator('#dialog-title').filter({hasText:'Your first command.'}).waitFor();
await page.keyboard.press('Escape');
assert.equal(await page.locator('.modal').count(),0);
await page.locator('[data-action="launch"]').click();
await page.locator('[data-action="end-mobile"]').click();
await page.waitForFunction(()=>document.querySelector('.phase-status').textContent.includes('ROUND 2')&&document.querySelector('.phase-status').textContent.includes('YOUR TURN'));
await page.locator('.battlefield').scrollIntoViewIfNeeded();
await page.screenshot({path:new URL('../screenshots/mobile-battle.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile combat has horizontal overflow');
assert.deepEqual(errors,[]);
console.log('Browser smoke passed: formation interception, Draw Fire targeting and expiry, Guard combo, piercing damage and screen bypass, mobile tactical controls, sticky resources, selection, reserves, economy, campaign flow, persistence; no JavaScript errors.');
await browser.close();
