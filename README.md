# Sprite Foundry

Sprite tester and map builder. All project files live at the root. No install or build step.

## Run

Extract the ZIP and open **index.html** in a modern browser. Keep both PNGs beside it. GitHub Pages also works: upload the extracted files to your repository's **main** branch, then enable Settings → Pages → Deploy from a branch → main → / (root). GitHub does not unpack ZIP uploads.

**New blank project**, beside **Open**, starts a fresh 20 × 14 map with no terrain, assets, mobs, painted background, walls, or blocked cells. Your saved sprite library and custom cuts remain available. **Restore previous project** under **Scene actions & shortcuts** recovers the project you had open before starting blank; it is kept for this session and in browser storage when available. Use **Save project** for permanent backups.

## Adjustable workspace

The editor fills the browser viewport without outside gutters. Drag the thin dividers beside the library and controls to resize their widths. **Library** and **Controls** buttons hide or show each panel; your layout is remembered in this browser. **Reset layout** restores the defaults. **Fullscreen** expands the editor to the display where your browser supports it. Panel dividers also support the arrow keys when focused. On smaller displays the sidebars open as overlays, leaving the canvas available across the full viewport.

Frequently used placement and animation controls appear first. Uploads, map management, display settings, and scene actions are grouped into expandable sections. The **Color** tab selects background painting. Use **Fit map** after resizing panels if you want to recenter the map.

## Sprite sheets

- **terrain5.png**: 4 × 4 grid, 16 separate tiles, read left to right then top to bottom.
- **Mobs5.png**: 4 × 4 grid, adjacent horizontal cells pair up: columns 1–2 and 3–4 in each row. Eight mobs, two idle frames each.
- **Asset sheets**: open **Upload sprite sheets** and choose your own image under **Asset sheets**. By default its 16 cells are independent static sprites, cut in the same order as terrain. They appear above terrain and below characters. No default asset art is included.
- Transparent PNGs are supported, including the supplied 1254 × 1254 sheets. Mob pairs use shared alpha bounds to preserve registration. Terrain padding is trimmed by default; turn it off to see full source cells.
- Expand **Upload sprite sheets**, then choose **Terrain sheets** for floor tiles, **Asset sheets** for static overlay objects, or **Character sheets** for animated, roaming characters. You can select several files at once. PNG, JPG, and WebP are accepted; transparent PNG is recommended so objects reveal the terrain behind them. Sheets begin with a 4 × 4 grid.
- Every upload is a separate entry in **Saved sheets**. Click an entry to choose its palette. Uploads with the same filename are also kept as separate entries, so you can compare versions.
- Mix sprites from any number of sheets on the same map. Each placed tile and character remembers its source sheet; switching sheets never changes existing placements. The picker also selects the correct source sheet.
- Images are stored in this browser using IndexedDB and restored when you reopen the same page. The entry says **Saved** when stored successfully, or **Session only** when browser storage is unavailable or full. Storage belongs to the browser and page origin: another browser, a new hosting address, or moving the local project may use a separate library. Use **Save project** to keep a portable backup.
- The two included sheets always remain available. Uploads from the previous single-sheet version are migrated where their browser storage is available.

## Edit a sheet's cut

Select a sheet in **Saved sheets**, then click **Edit this sheet's cut**. A large **Sprite cutting studio** popup opens above the map, with the image on the left and settings on the right. Drag the **green vertical or horizontal lines** to move individual boundaries. Outer lines set the outside edges. Adjacent lines cannot cross. Blue dashed outlines show the final source rectangles after gaps and insets. Click **Apply & save cut** to save the dragged cuts. Each sheet keeps its own boundaries, including uneven rows or columns. Close the popup with **Close** or Escape; unapplied changes are discarded when you reopen it.

You can also set columns and rows, outer margins, gaps between cells, and X/Y insets numerically. Changing columns, rows, or margins returns that axis to even spacing; gaps and insets keep independently dragged lines. Changes apply only to that sheet and are stored with its image. **Reset to 4 × 4** restores the original layout.

**Detect transparent gutters** automates the initial cut: it searches for transparent column and row gaps near the selected grid's expected boundaries. It proposes lines in the popup without saving them. Review or drag the result, then click **Apply & save cut**. Boundaries without a clear gutter remain at their current position. Sprite counts and left-to-right order are preserved, and mob frames still use shared pair bounds during transparency trimming. The supplied terrain sheet detects 6/6 internal gutter boundaries; the mob sheet detects 5/6, leaving one for review.

This works best with transparent PNGs whose sprites occupy distinct grid cells. Empty images, opaque sheets, and grids with no clear gaps require manual cuts. If local browser pixel reading is restricted, re-upload the sheet through the editor. For future fully deterministic automation, exporting a PNG plus frame-coordinate JSON is preferable to image guessing; Aseprite supports exporting sheet metadata ([official documentation](https://www.aseprite.org/docs/cli/)). This prototype's automatic mode uses transparency; atlas metadata importing is not yet included.

Columns and rows can each range from 1 to 16. Mobs need even columns because adjacent horizontal cells remain paired. Terrain and assets use every cell independently. Cell IDs run left to right, then top to bottom. Changing the grid can change the artwork at an existing numbered placement. A cut that removes used IDs is rejected, including IDs used on other floors or in undo history. Upload another copy to compare a substantially different grid without affecting earlier placements.

Margins remove the outside border; gaps skip gutters between cells; insets crop inward within every cell. Values are source-image pixels. Sprite transparency trimming is applied after these cuts. Uploaded cut settings are included in project backups; custom cuts on the two included sheets are also backed up.

## World maps and dungeon floors

Use **World & dungeon maps** in the right sidebar to create a **Dungeon floor**, **World map**, or **Area / room**. New maps start empty at the current map dimensions and share your sheet library. Select a map from **Current map** to switch. Each map keeps its own terrain, assets, mobs, size settings, and editing history during the session.

Edit the project name and map details to group floors by dungeon or region. Floor numbers support -99 to 999 for basements and upper levels. Click **Update map details** after editing its name, type, group, or floor number. **Duplicate current map** creates an independent copy. A project supports up to 200 maps.

**Save project** downloads every map and floor, all uploaded sheets, and cutting settings in one JSON file. **Save current map only** exports the selected map with its used uploaded sheets. **Open project** accepts either export and older single-map files. Opening a project replaces the map collection and adds its sheet library to your existing library. It validates all maps before changing the current project. Use project exports for portable backups; browser autosave stores your map collection locally. Map history is kept during the current session and is not exported.

## Controls

Choose **Terrain**, **Assets**, or **Mobs** and click a sprite. Click or drag to paint. Each map cell holds one terrain tile, one static asset, and one mob on separate layers, above a background color layer. Erasing affects only the selected layer. Assets keep their aspect ratio and remain still while mobs animate and roam. Use **Show assets** to hide or show overlays, including in PNG exports. **Trim asset padding** controls their transparent borders. The picker prefers a sprite on the current layer, then searches the other sprite layers.

| Action | Control |
| --- | --- |
| Paint | B |
| Erase current layer | E or right click |
| Terrain / background flood fill | F |
| Pick sprite | I |
| Pan | H, middle drag, or Space + drag |
| Zoom | Wheel or + / − |
| Play / pause | P |
| Draw wall boundaries | W |
| Paint blocked cells | X |
| Undo / redo | Ctrl/Cmd + Z / Ctrl/Cmd + Shift + Z |

Mobs animate and roam across any painted terrain. Adjust idle frame rate and movement speed in Scene controls. **New mob size** sets the size of mobs you place next, from **10% to 350%**. Each placed mob captures that value and keeps it even after the general bar changes. **Placed mob sizes** gives every mob its own slider, labeled with its character and placed cell coordinates. Individual size edits support undo/redo and remain with that mob in project saves, dungeon floors, duplication, and PNG export. Older projects without individual sizes inherit their floor's saved general mob size.

**New asset size** now works the same way: each newly painted asset captures its own **10% to 350%** size. **Placed assets** gives every asset an independent size slider, labeled with its cell. Changing the general bar affects future placements, while existing assets keep their sizes. Individual edits support undo/redo and persist in floor changes, project saves, duplication, and PNG export. Older projects inherit each floor's previous general asset size.

Both placement defaults affect the painting preview. Large sprites extend across neighboring cells; PNGs crop at the map boundary. Pause returns mobs to placed cells. Terrain artwork itself does not define collision rules: use the boundary and collision controls below. Resize supports 4–64 tiles per dimension. Resizing, clearing, and demo loading affect the current map and can be undone.

## Boundaries and sprite collision

The **Wall** tool (W) defaults to **Straight wall lines**. Click and drag: the first drag direction locks horizontally or vertically, and a preview shows the whole line before you release to apply it. The line snaps to grid edges and supports one-step undo. Right-drag erases a straight run. Click without dragging edits one segment. Turn off **Straight wall lines** for freehand painting; hold **Shift** when starting a drag to temporarily draw or erase a straight line. Cancelled drags do not change walls.

Walls are drawn with about **35% opacity** and a thinner stroke; blocked-cell fills use about **9% opacity**, keeping your art visible. **Block** (X) paints cells that mobs cannot enter, without altering terrain or colors; right-click unblocks them. **Clear walls & blocked cells** removes only these collision layers. All boundary editing supports undo/redo. Boundaries and blocked cells survive resizing inside the new bounds and are saved per map or dungeon floor.

In **Boundaries & collision**, toggle collision globally, mob-versus-mob collision, mob-versus-asset collision, and map-edge hitbox limits separately. **Roam only on painted terrain** controls where mobs wander, independently of the collision toggle. **New assets are solid** sets the default for future placements. Each placed mob and asset has a **Solid sprite** checkbox: decorative assets can be non-solid, and non-solid mobs pass through other sprites while still respecting painted boundaries.

Collision uses square hitboxes centered on placed assets and moving mobs, scaled by each sprite's individual size and the **Hitbox size** percentage. **Show sprite hitboxes** displays them. Solid mobs avoid obstacles and other solid mobs rather than bouncing; destination reservations prevent them from choosing the same space, and swept movement prevents skipping through thin walls. Red-orange overlays show blocked cells and drawn walls. Visibility toggles do not disable collision. Collision overlays and hitboxes are editor guides and are omitted from PNG exports; the full collision data is included in JSON project and map exports.

The editor permits overlapping placement so you can arrange a scene. Mobs spawned inside blockers, or enlarged until they overlap them, may remain stuck until you resize/reposition the obstruction or disable the relevant collision. There is no automatic pushing, combat, or pixel-perfect silhouette collision. Older projects start with empty boundary layers; their existing assets remain non-solid until enabled, while mobs are solid. Newly uploaded and placed assets use the **New assets are solid** default.

## Paint background colors

Select **Color** in the library. Choose a brush color or a swatch, then click or drag over map cells. These colors are painted underneath the terrain and sprites, showing through transparent areas and empty cells. The **Fill** tool fills connected cells with the same background color. **Pick** samples a cell's color. **Erase** restores the map base color for that cell. Sprite layers remain intact.

**Map base color** changes unpainted cells; **Paint whole background** fills every cell with the brush color. Background edits support undo/redo. Each world map and dungeon floor keeps its own base color and painted cells, and they are included in project exports and PNGs. Resizing preserves colors inside the new bounds. Older files get an empty background layer and the default dark base color.

Project files include all sprite layers and background colors, walls and blocked cells, collision settings and solid flags, sheet cuts, individual mob and asset sizes, new-placement defaults, all uploaded images (including sheets not yet placed), and active sheet selections. Existing artwork is preserved if an imported project has conflicting sheet IDs or different cuts. Older projects load as one area map with missing layers initialized as needed. Keep the included PNGs beside the app; those bundled defaults are not embedded in project JSON. Workspace panel layout is a browser preference and is not included in project files.

**Export PNG** creates a grid-free image at 64 pixels per tile, using placed mob positions and first idle frames. Show mobs also controls PNG export. If your browser restricts local canvas export, run from GitHub Pages or a static web server.

Everything runs in your browser. Desktop mouse and keyboard are the primary controls; touch painting is supported. Browser storage can be cleared or restricted, so use JSON exports as backups.

Files: index.html, style.css, app.js, library.js, project.js, ui.js, physics.js, autocut.js, Mobs5.png, terrain5.png, README.md, .nojekyll, .gitignore, verify.cjs. Optional editor logic checks: `node verify.cjs`.

Artwork is included as supplied. Add a license if you want to specify reuse rights before publishing.
