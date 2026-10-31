# MOUVRA continuation — 1 November 2026

## User-approved scope and current state

Continued chat 01a191d6-b4dc-7952-b7c3-d2fe82ded3bd in the existing local checkout and branch codex/mouvra-continuation. Latest user instruction supersedes the original deployment plan: do not push to GitHub; run preview only after implementation. Keep all changes local.

Completed:
- Catalog expanded from 6 to 30 models, 12 brands, including 6 Attack Shark models and VXE, VGN, AJAZZ, KYSONA, Darmoshark, Zaopin. See research/catalog-expansion.md for official sources and limitations.
- Home starts with an actual official GLB, slow 8-degree/second rotation, previous/next controls and pause. Three verified GLBs are available; new catalog models use real official photos, not fabricated 3D.
- Distinct tall/horizontal collection compositions; separate live profile scene; two equal-size comparison scenes; contained side-angle model on About.
- Grip/hand-size choices change the displayed mouse and recommended pair.
- Comparison immediately starts with two models, restores valid saved choices, accepts up to four, and searches the expanded catalog.
- Responsive CSS moved after base CSS; phone catalog images are larger; 360/390/768px checked.
- Navigation has a 130ms exit and 320ms entrance, scroll reset and focus transfer. Root cause fixed: Storefront now lives in the persistent root layout instead of being remounted in the catch-all page.
- Native reduced-motion stops autoplay; scenes load near the viewport and stop rotation while offscreen or hidden. Failed GLBs keep a photo fallback.
- Missing specifications/prices remain unknown and are excluded from the light-weight filter rather than becoming zero.

## Verification

- TypeScript: tsc --noEmit passes.
- Node tests: 5 pass (3 account/API, 2 catalog/provenance/assets).
- ESLint: no errors. Existing warnings include img guidance; the build also reports the existing large-chunk and lucide barrel optimization warnings.
- Production build: passes.
- Browser: 12 scenarios pass in Chrome, no page errors. Checks cover actual GLB switching/wrap/pause, lazy scenes, navigation exit/top/focus, prefilled comparison and cap, guide, About containment, expanded filters, unknown specifications, three mobile widths and reduced motion.
- Static final review found no confirmed important issues; its catch-all remount concern was reproduced in-browser and fixed.

Run browser checks with a preview already running:

```powershell
# Set PLAYWRIGHT_MODULE to a local playwright index.mjs when it is not installed in this project.
# Optional: CHROME_PATH (browser executable), PREVIEW_URL, PREVIEW_OUTPUT_DIR.
node scripts/check-preview.mjs
```

Preview command: npm run dev (127.0.0.1:5173). On Windows, the running final preview was started with a hidden process; its output is in .sites-runtime/preview-stdout.log and preview-stderr.log. No deployments or GitHub writes were performed.

## Rulings

- Preserve the existing ivory/stone/oxblood visual identity; the user requested composition/motion improvements, not a brand replacement.
- Keep authentic 3D limited to the three sourced GLBs. More catalog entries do not imply an official 3D model exists.
- Source verification remains dated 31 October 2026, when data was gathered; the final UI verification completed on 1 November local time.
- Keep the branch and checkout in place, per the user's instruction to work locally.
