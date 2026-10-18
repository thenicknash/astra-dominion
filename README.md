# Astra Dominion

A playable single-player fleet management and tactical strategy game, set in an anime-inspired, neo–Art Deco science-fiction universe. Built with HTML, CSS, and JavaScript, with no runtime packages or build step.

## Play

On Windows, double-click **Play.cmd**. It starts a hidden local Node server and opens the game in your default browser. Node.js 20 or newer is required and is already installed on this machine.

Alternatively, run `npm start` from this directory, then open **http://127.0.0.1:4173**. Set the `PORT` environment variable to use another port. The server listens only on this computer.

This is a local game; nothing is deployed to a public service. Progress automatically saves in this browser under `astra-dominion-save-v1`. Use Settings to export or import a campaign. Keep the same address and browser to retain your automatic save. No account, backend, or internet access is required for gameplay. Fonts have system fallbacks.

## The campaign

Liberate six sectors before the citadel falls. Each operation has three phases:

1. **Preparation:** commission ships, build infrastructure, repair the citadel, and position your fleet in the three friendly columns. Select a fleet card and click a tile. Occupied friendly tiles swap ships. Click the selected ship or its roster card again to deselect it while keeping its position. To undeploy a ship, select it and use **Return to reserve** below the battlefield. Auto deploy fills a balanced formation.
2. **Engagement:** each ship receives two actions per round. Select a ship, then click an adjacent empty tile to move or a highlighted enemy to fire. Each costs one action. Guard uses the remaining actions and reduces incoming damage by 45%, including damage intercepted for another ship. Your fleet acts first. Enemies prefer vulnerable ships within firing range; otherwise they advance toward the nearest ship and may fire after moving. Draw Fire can override those targets.
3. **Aftermath:** receive base income, victory bounties, and a choice of salvage rewards. Surviving ships heal; destroyed ships are lost. Every two kills grants a surviving ship seven extra hull. Winning advances the campaign. Losing or withdrawing damages the citadel and lets you retry if it survives.

Win each engagement within 12 rounds. Main abilities cost two actions and one command energy, and have a two-round cooldown. Draw Fire costs one action and one energy, with a separate two-round cooldown. Shared energy refills each round. Reserves do not participate in combat. An emergency frigate arrives if the entire fleet is lost and the citadel survives. Existing v1 campaigns load without resetting progress.

| Ship | Role | Ability |
| --- | --- | --- |
| Aegis frigate | Durable frontline; screens rear ships | Solar lance: 250% weapon damage; also has Draw Fire |
| Seraph lancer | Long-range artillery | Piercing ray: 230% damage; ignores guard and screening |
| Halo tender | Support | Restores 38 hull to allies within 3 tiles |
| Crown cruiser | Heavy warship; screens rear ships | Adds 25 shielding to every friendly ship; also has Draw Fire |

Citadel infrastructure includes trade spires, foundries, shield networks, drydocks, photon arsenals, and command-energy reactors. Income is paid after every operation. Further levels cost more; resources and capacity are enforced.

## Positioning and strategy

An Aegis or Crown protects allies **one or two columns behind it in the same lane**. When an attack comes down that lane from beyond the protector, the protector intercepts 50% of the damage; the intended target receives the rest. A friendly fleet faces right and an enemy fleet faces left. A shot from a different lane, or from behind the protector, bypasses the formation. These rules apply to both sides.

Only the closest living protector ahead of the target intercepts; protection never stacks or chains. Each ship applies its own Guard and shields to its damage share. Destroying or moving the protector immediately breaks its protection. Intercepted damage is committed to that protector; overkill is not transferred back to the rear ship. Ordinary ships obstruct movement but do not block shots.

**Draw Fire:** select an Aegis or Crown and activate its beacon. Enemies within three tiles must prioritize it if they can reach firing range from their current position or after one legal move. It lasts through the upcoming enemy phase and expires when the next player round starts. If multiple beacons qualify, the nearest wins; equal-distance ties use the older ship's ID. Dead, out-of-radius, or unreachable beacons do not prevent enemies from attacking other targets. Spend the remaining action to Guard, attack, or reposition. The beacon's range follows the ship if it moves.

Enemies normally choose the lowest hull-plus-shields target in firing range, breaking ties by distance and then ID. They recalculate before every action, so killing a protector or repositioning a beacon can change later attacks. Enemy arrows show current planned targets. **SCREENED** marks potential same-lane protection, while **BEACON** marks active Draw Fire. Hover a target to see damage after Guard and screening, before shields.

Use Auto deploy to place Aegis/Crown ships forward with fragile ships behind them. Keep Halo tenders within three tiles of damaged allies for healing. Distance counts horizontal plus vertical steps. Move to another lane to bypass an enemy screen, or use a Seraph's Piercing Ray. Solar Lance now deals 75 damage at base attack, compared with 60 from two ordinary shots; Piercing Ray deals 90 compared with 78, while bypassing Guard and screening. Shields still absorb Piercing Ray damage. Both specials retain their energy cost and cooldown, so ordinary fire remains useful.

Focus fire to remove enemy ships before their turn. Guard on a frontline protects both its own hull and its ability to keep intercepting. Use Draw Fire to rescue a vulnerable ally outside the screen. Invest in income early when you can still field enough ships; fleet-wide shields and weapons upgrades become more valuable as your fleet grows.

## Controls and accessibility

- Mouse or touch: select ships, tiles, tabs, and orders.
- Keyboard: Tab to focus controls, Enter to activate, Escape to close a dialog or cancel a targeting ability.
- The Field Manual explains the rules in-game. Optional command sounds start muted.
- Responsive desktop/mobile layouts, reduced-motion support, named battlefield controls, focus indicators, and dialog focus trapping are included.

## Files

- `dist/engine.js` — deterministic economy, combat, campaign, and save validation.
- `dist/app.js` — interface, contextual commands, persistence, and audio.
- `dist/style.css` — neo–Art Deco visual design and responsive layouts.
- `dist/assets/aurelia-key-art.png` — generated anime illustration used by the hero and officer portrait.
- `server.mjs` — dependency-free local static server.
- `tests/engine.test.mjs` — economy/combat/save tests and an entire campaign using legal commands.
- `tests/browser-smoke.mjs` — isolated Chrome interface test and desktop/mobile screenshots. Requires Playwright; uses the bundled Codex runtime on this machine or a locally installed package. Override its package location with `PLAYWRIGHT_PACKAGE` if necessary.
- `screenshots/` — visual QA captures.
- `ART-DIRECTION.txt` — artwork provenance and exact generation prompt.

Run `npm test` for gameplay tests. Run `node tests/browser-smoke.mjs` with the local server running for browser tests.

## Scope

This first playable version includes a complete six-operation campaign and original art direction. Combat is a turn-based tactical board with animated hit feedback, vector ship tokens, and sound cues. There is no multiplayer, account system, or real-time 3D battlefield.
