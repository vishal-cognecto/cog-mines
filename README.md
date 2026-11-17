# cognecto · mineral chain, today and with Cognecto

Interactive 3D holographic before / after of how a tonne of stone moves through Haryana's mineral chain.
It follows the proposal "Haryana Mines & Geology: Illegal Mining Control and Revenue Growth" (Cognecto, 11 November 2026), pages "What happens now in Haryana mining" and "What changes with Cognecto".
Built for government presentations and the website, alongside the living model in `../tech-moat`.
All data is illustrative and generated locally; there is no backend.

## The story

Six steps sit on one haul road: stone mine, pass, weighbridge, crusher, dealer and buyer.

- **Today** shows the six points where the number is typed in by the party that benefits.
  One truck skips the weighbridge, one drops part of its load on the road, the crusher holds 30 t of paper stock, and the buyer may not exist.
- **With Cognecto** shows the same six steps with each number captured at the source: geo-fence and drone survey, QR pass with Vahan and GST checks, online weighbridge with ANPR, GPS and FASTag, gate weighing at the crusher, border reads for inter-state claims, and QR receipt by the buyer.

A live counter tracks loads dug against loads on the books, and the royalty missed at ₹100 a tonne.

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static site in dist/, works from any folder or sub-path
npm run preview      # serve the built site
npm test             # unit tests (layout, truck traffic, content)
npm run e2e          # Playwright walk-through, screenshots in tests/e2e/shots
```

Open a view directly with a hash: `#before`, `#after`, or a step such as `#after/3`.

## Controls

| Key | Action |
| --- | --- |
| `B` | Flip between today and with Cognecto, staying on the same step |
| `1`-`6` | Focus a step |
| `0` | Whole chain |
| `←` `→` | Previous / next step |
| `Space` | Start or stop the autoplay tour |
| `H` | Hide the HUD |
| `P` | Projector mode (larger type, higher contrast) |
| `` ` `` | Presenter panel: hide the client name, the portal name or any figure |

Panels can be dragged by their header and collapsed with a double-click.

## Editing content

- `src/config/content.ts` holds every step, gap, control, figure and the control matrix.
- `src/config/tour.ts` holds the autoplay order and timing (each step today, then with Cognecto).
- `src/scenes/chain/layout.ts` holds station positions, the road and the camera framing per step.
- `src/scenes/chain/stations.tsx` holds the 3D model of each step, today and with Cognecto.

## Structure

```
src/
  config/        content, theme, tour
  core/          renderer, post effects, camera rig, scene router, director, store
  holo/          hologram shaders, grid, text, dust
  hud/           panel kit, widgets, chrome
  scenes/chain/  layout, truck traffic, stations, stage and HUD for both scenes
tests/
  unit/          vitest
  e2e/           Playwright
```

The engine (`core`, `holo`, `hud`) is copied from `../tech-moat`.
Changes to the shared look should be made in both projects.
