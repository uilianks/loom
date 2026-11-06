# loom reference

Material files are plain JavaScript (or TypeScript) evaluated with the DSL as globals. Fields are
lazy: nothing is computed until a material is built, at its `size`.

Coordinates: the tile is u, v in [0, 1) with v pointing **down** (image rows). Distances and radii
are in **tile units** (0.01 = 1% of the tile), so a material looks the same at 256 or 2048.

## Palette and materials

| Call | Meaning |
|---|---|
| `pal({ moss: "#4c6a2c", dark: "moss" })` | Named colors (or aliases), usable anywhere a color string is. |
| `material(name, opts?, channels)` | Define a material. |
| `include("other.tx.js")` | Run another file (shared palettes, helpers). |

**opts**: `size` (power of two, 16–4096, default 512), `depth` (relief depth in tile units for the
normal map, default 0.04), `normal` (`"gl"` green-up: Blender/Godot/Unity, default; `"dx"`: Unreal),
`ao` (strength of the derived AO, 0 = off, default 1).

**channels** (each a number, field, color or texture): `height` (0..1, default 0.5), `color` (albedo,
default "#808080"), `rough` (default 0.7), `metal` (default 0), `emit` (emissive color, optional),
`ao` (multiplied into the derived AO).

## Generators

All periodic over the tile. `scale` is a whole number (cells across) or `[x, y]` for stretched
detail (wood grain, streaks). `seed` picks a different variation.

| Generator | Options | Gives |
|---|---|---|
| `noise()` | `scale` 4, `octaves` 4, `gain` 0.5, `lacunarity` 2, `seed` | fractal gradient noise, about 0..1 around 0.5 |
| `ridged()` | same | sharp crests (veins, cracks when thresholded) |
| `cells()` | `scale` 6, `jitter` 1, `seed` | distance to the nearest point (0 at the point); `.edge` (0 on borders), `.id` |
| `dots()` | `scale` 8, `radius` 0.3, `jitter` 0.6, `soft` 0.1, `seed` | soft round spots (rivets, pebbles, pores) |
| `bricks()` | `rows` 8, `cols` 4, `gap` 0.012, `bevel` 0.02, `offset` 0.5, `vary` 0.15, `wobble` 0, `seed` | beveled height; `.mask` (1 brick), `.id`, `.dist` |
| `tiles()` | same as bricks, `offset` 0 | a grid of tiles |
| `hex()` | `cols` 6, `gap` 0.04, `bevel` 0.08, `vary`, `seed` | hexagonal tiles (rows chosen to tile); `.mask`, `.id`, `.dist` |
| `planks()` | `rows` 6, `per` 2, `gap` 0.006, `bevel` 0.01, `vary` 0.2, `grain` 40, `seed` | boards of random length; `.grain`, `.mask`, `.id` |
| `scales()` | `cols` 8, `rows` (2×cols), `size` 0.62, `seed` | overlapping scales/shingles; `.id` |
| `stripes()` | `count` 8, `dir` "h"/"v", `soft` 0.3 | parallel bands |
| `waves()` | `count` 6, `dir`, `warp` 0.4, `scale` 3, `seed` | wavy bands (sand ripples, rings) |
| `weave()` | `threads` 8 (even), `gap` 0.12, `seed` | basket / cloth weave, over-under strips; `.mask` (1 on a thread) |
| `checker()` | `cols` 8, `rows` (= cols), both even | checkerboard 0 / 1 (floors, gingham, race flags) |
| `shape()` | `kind` circle / rect / ngon / star / ring / line, `cx` `cy` 0.5, `r` 0.25, `w` `h` (a ring's or line's `w` is its band width), `sides` 6, `inner` (a star's valley radius, default `r / 2`), `round`, `rot` degrees, `soft` 0.01, `x0 y0 x1 y1` (line) | a decal: 1 inside, 0 outside, soft edge; positions wrap so shapes near an edge continue on the other side. Road markings, manhole rims, runes, hazard stripes (`stripes().rotate` + a `rect` mask), buttons, logos. |

### Images

| Call | Meaning |
|---|---|
| `image("photo.png", { seamless = 0 })` | A PNG (a photo, a painted texture, a pxl or vex export; path relative to the material file) as a color, resampled to the tile size. `seamless` (0..0.5) blends a band that wide at the edges with a half-tile-offset copy, so a photo tiles without a visible seam. `.luma()` turns it into a height or mask field; `.hsv()`, `.mix()` and `.mul()` work as on any texture. |

`bricks` checks that `rows × offset` is whole, so the courses line up across the tile edge.

## Field operators

Every operator returns a new field; numbers work anywhere a field does.

| Operator | Meaning |
|---|---|
| `add sub mul div min max (b)` | arithmetic |
| `mix(b, t = 0.5)` | blend toward `b` by `t` (a mask field or number) |
| `pow(k) abs() invert() clamp(lo, hi)` | |
| `levels(inLo, inHi, outLo = 0, outHi = 1)` | remap a range (clamped) |
| `smooth(lo, hi)` | smoothstep |
| `threshold(t = 0.5, soft = 0)` | 0 below, 1 above, soft band |
| `normalize()` | stretch the actual min..max to 0..1 |
| `blur(r = 0.01)` | gaussian-ish blur (wraps) |
| `warp(f, amount = 0.05, f2?)` | domain warp by `f` (and `f2` for y) |
| `offset(du, dv)` `repeat(k)` `rotate(90/180/270)` `flip("x"/"y")` | moves that keep the tiling |
| `edge(k = 8)` | slope steepness 0..1 |
| `convex(r = 0.01, k = 12)` | raised ridges and edges (wear) |
| `cavity(r = 0.01, k = 12)` | hollows and creases (grime) |
| `facing("up"/"down"/"left"/"right", k = 6)` | where the surface faces that way (moss, dust, snow) |
| `drips({ length = 0.25, density = 0.5, seed })` | streaks running down from this mask (rust, rain) |
| `as("name")` | name it for the viewer, `list` and feedback |

## Color

| Call | Meaning |
|---|---|
| `color("#rrggbb" or name)` | flat color |
| `ramp(field, ["#a", "#b", ...])` or `[[pos, color], ...]` | gradient map |
| `tex.mix(other, t)` | blend (other: color string or texture; `t` a mask) |
| `tex.mul(field)` | multiply (cavity darkening) |
| `tex.hsv({ h, s, v })` | hue shift in degrees, saturation/value multipliers (numbers or fields) |
| `tex.luma()` | brightness as a field |
| `tex.as("name")` | name it |

## Output and commands

`loom build file.tx.js [--out DIR] [--only a,b] [--size N] [--no-preview]` writes, per material:

| Path | Content |
|---|---|
| `out/<name>/<name>_albedo.png` | sRGB color |
| `out/<name>/<name>_normal.png` | tangent-space normal (GL by default) |
| `out/<name>/<name>_height.png` | 16-bit gray |
| `out/<name>/<name>_roughness.png`, `_metallic.png`, `_ao.png` | 8-bit gray |
| `out/<name>/<name>_orm.png` | AO, roughness, metallic in R, G, B (glTF uses G/B; Unreal all three) |
| `out/<name>/<name>_emissive.png` | when `emit` is set |
| `out/<name>/<name>.material.json` | the files, size, normal convention, depth and the seam check |
| `out/_preview/<name>.png` | tiled plane, sphere, cube and every map (the folder holds a `.gdignore`, so Godot does not import previews) |

`loom info file.tx.js <name>` prints value ranges per map and the seam check. `loom list file.tx.js`
lists materials and named fields. `loom serve file.tx.js [--port 4350] [--no-out]` runs the viewer.

**Annotate mode** in the viewer (`✎ annotate` or `a`): pen strokes (markup colors, or a palette color
for "make it this color"), notes, erase, three widths, a comment. **send to Claude** writes
`<out>/_feedback/<material>.json`: `notes` (`x, y` texture pixels, `uv`, `text`, `at`: albedo,
height, rough, metal, ao and every named field's value there) and `strokes` (`points`, `bbox`,
`color`, `key`, `kind`, `middle`: the same values at the stroke's middle), plus `<material>.annotated.png`.
