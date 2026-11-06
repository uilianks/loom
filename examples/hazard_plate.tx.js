// A tread-plate steel floor with a painted hazard band: a metal material (metallic + roughness),
// stripes masked by a rect decal, paint worn off the raised studs, rust bleeding down from the seams.
pal({ steel: "#7c8288", steelL: "#a9afb4", steelD: "#4b5055", yellow: "#e2b21c", black: "#1d1c1a", rust: "#7a3b1c" })

const plates = tiles({ rows: 2, cols: 2, gap: 0.006, bevel: 0.01, vary: 0.05, seed: 2 }).as("plates")
const studs = dots({ scale: 14, radius: 0.22, jitter: 0, soft: 0.25 }).as("studs")
const grain = noise({ scale: [40, 6], octaves: 3, seed: 5 }).as("brushed")

// Hazard band: diagonal stripes, only inside a horizontal strip across the middle.
const band = shape({ kind: "rect", cy: 0.5, w: 1.2, h: 0.22, soft: 0.004 }).as("band")
const diag = stripes({ count: 12, dir: "v", soft: 0.04 }).warp(stripes({ count: 1, dir: "h", soft: 1 }), 0.25).as("diag")

const height = plates.mul(0.6).add(studs.mul(0.25)).add(grain.mul(0.03)).as("height")
const worn = height.convex(0.006, 14).add(noise({ scale: 9, seed: 7 }).sub(0.5).mul(0.6)).threshold(0.45, 0.08).as("worn")
const paint = band.mul(worn.invert()).as("paint")
const rust = plates.mask.invert().drips({ length: 0.12, density: 0.35, seed: 9 }).mul(noise({ scale: 6, seed: 4 }).levels(0.3, 0.7)).mul(0.75).as("rust")

material("hazard_plate", { size: 512, depth: 0.03 }, {
  height: height.add(paint.mul(0.02)),
  color: ramp(grain, ["steelD", "steel", "steelL"]).mix("rust", rust).mix(ramp(diag, ["black", "yellow"]), paint),
  rough: grain.levels(0, 1, 0.3, 0.45).mix(0.85, rust).mix(0.6, paint),
  metal: paint.max(rust).invert(),
})
