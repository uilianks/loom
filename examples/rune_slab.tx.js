// A basalt floor slab with a glowing rune circle: hex tiles, shape() decals cut into the stone,
// and an emissive channel where the runes are carved.
pal({ basalt: "#3a3a40", basaltL: "#55555c", basaltD: "#222227", dust: "#6e665a", glow: "#38e0ff", glowD: "#0f5a6e" })

const h = hex({ cols: 6, gap: 0.035, bevel: 0.06, vary: 0.25, seed: 4 }).as("hex")
const grit = noise({ scale: 18, octaves: 5, seed: 6 }).as("grit")
const cracks = ridged({ scale: 7, octaves: 3, seed: 8 }).threshold(0.9, 0.04).mul(h.mask).as("cracks")

// The rune circle: two rings, a seven-point star and four spokes, all centred on the tile.
const rune = shape({ kind: "ring", r: 0.3, w: 0.014, soft: 0.003 })
  .max(shape({ kind: "ring", r: 0.215, w: 0.008, soft: 0.003 }))
  .max(shape({ kind: "star", r: 0.2, inner: 0.08, sides: 7, soft: 0.003 }).sub(shape({ kind: "star", r: 0.185, inner: 0.07, sides: 7, soft: 0.003 })).clamp(0, 1))
  .max(shape({ kind: "line", x0: 0.5, y0: 0.18, x1: 0.5, y1: 0.82, w: 0.008, soft: 0.003 }))
  .max(shape({ kind: "line", x0: 0.18, y0: 0.5, x1: 0.82, y1: 0.5, w: 0.008, soft: 0.003 })).as("rune")

const height = h.mul(0.8).add(grit.mul(0.12)).sub(cracks.mul(0.2)).sub(rune.mul(0.18)).as("height")
const dust = height.cavity(0.006, 14).max(h.mask.invert().mul(0.7)).as("dust")

material("rune_slab", { size: 512, depth: 0.045 }, {
  height,
  color: ramp(h.id.mix(grit, 0.45), ["basaltD", "basalt", "basaltL"]).mix("dust", dust.mul(0.55)).mix("glowD", rune),
  rough: grit.levels(0, 1, 0.7, 0.92).mix(0.35, rune),
  emit: ramp(rune.mul(noise({ scale: 5, seed: 3 }).levels(0.3, 0.7, 0.6, 1)), ["#000000", "glow"]),
})
