# Milestone 8 — Persistence & Development Tools

Milestone 8 implements the originally planned four workstreams without changing the approved 7.5 dungeon layouts, enemy encounters, artwork, or reward presentation.

## 1. Save/load

- **Continue saved adventure** on the character selection screen loads the most recent valid manual or autosave.
- **Escape → Save / Load** opens manual save, manual load, autosave recovery, export, import, and deletion controls.
- **F5** saves manually while playing or paused. Autosaves occur after 90 seconds of active gameplay, on successful region changes, and when closing/reloading a living adventure.
- Browser saves use localStorage keys `first-descent.m8.manual` and `first-descent.m8.auto`. JSON export creates a portable local backup. They are **not cloud synchronized**.
- Saved data uses a versioned (`version: 1`) format. Saves contain the character and equipped gear, inventory and dropped items, gold, experience, improvements, quest flags, NPC dialogue, trader stock, dungeon keys and doors, chests, activated objects, explored terrain, enemies and boss state, giant defeats, wave state, dungeon seals, and visited regions.
- Large static tile maps and graphics are **regenerated deterministically** from the seed and original generation settings, then restored using compact mutable-state overlays.
- Malformed, incompatible, and incomplete saves are rejected with an explanation; a missing manual save does not prevent autosave recovery.
- While loading, necessary on-demand biome and dungeon artwork is requested before gameplay resumes.
- Death is not a save point; the previous valid save can still be loaded.

## 2. Modular development editors

Open **Development tools** from the game's selection screen or visit `game/tools.html`.

- **Monster Editor:** Select an established creature and optionally override HP, speed, damage, detection, attack speed, or armor.
- **Encounter Balance:** Adjust seeded story-dungeon budgets (−2…+5) and additional elite chance (0…25 percentage points).
- **Content profiles:** Export/import validated JSON or restore original monster and encounter defaults.
- Edits are opt-in, browser-local and applied on game refresh or new run. Unedited profiles retain all existing values. Existing sprites and enemy abilities are never rewritten.

## 3. User-triggered generation checks

Under Development tools → Generation Checks, select a generator, seed, and run count (1–25); press **Run checks now**.

Available generators: Classic, Raider Cellar, Bone Chapel, all three Underkeep floors, Grand Hall, Labyrinth, Three Wings, Dunwood, and Expedition.

The checks report the generated dimensions, rooms, enemy spawn count, and available connectivity/objective validation errors. **No generation checks are performed automatically by opening the editor**. No validation, simulations, or benchmarks were executed during implementation at the user's request.

## 4. Polish

- Consistent save/load messages, a Continue entry point, and portable backup flows.
- Asset preloading before restoring visited regions.
- Exact story-dungeon generation inputs preserved across subsequent saves.
- Updated journal and inventory guidance reflecting Milestone 8.
- Existing combat, visuals, approved beaches, roads, classic and legendary layouts, quest rewards, and 45 starting gold are unchanged.

## Known boundaries

Browser storage is per-browser and per-site. Clearing browser site data removes local saves; export a backup first. Save version 1 is not a guarantee of compatibility with future, structurally different game builds. The editor does not modify repository code or publish settings to GitHub; its content profiles are local to the browser.

**Acceptance status:** implemented and committed; awaiting gameplay verification. No developer-initiated test runs were performed.
