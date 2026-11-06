// Writes each material's maps (PNG), a packed ORM map, a JSON manifest and the preview sheet.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { type LoomError, wrap } from "../core/errors.ts";
import { type Maps, seamScore } from "../core/material.ts";
import { png } from "../core/png.ts";
import type { Project } from "../core/project.ts";
import { clamp } from "../core/util.ts";
import { previewSheet } from "./preview.ts";

export interface OutputOptions { only?: string[]; size?: number; preview?: boolean }
export interface OutputResult { written: string[]; errors: LoomError[]; lines: string[] }

const to8 = (b: Float32Array) => { const o = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) o[i] = Math.round(clamp(b[i]) * 255); return o; };
const to16 = (b: Float32Array) => { const o = new Uint16Array(b.length); for (let i = 0; i < b.length; i++) o[i] = Math.round(clamp(b[i]) * 65535); return o; };
const z = (b: Uint8Array) => deflateSync(b);

export function writeMaps(name: string, m: Maps, dir: string, flipG = 1): string[] {
  mkdirSync(dir, { recursive: true });
  const n = m.n, files: string[] = [];
  const put = (file: string, data: Uint8Array) => { const p = join(dir, file); writeFileSync(p, data); files.push(p); };
  put(`${name}_albedo.png`, png(n, n, to8(m.albedo), 3, z));
  put(`${name}_normal.png`, png(n, n, to8(m.normal), 3, z));
  put(`${name}_height.png`, png(n, n, to16(m.height), 1, z, 16));
  put(`${name}_roughness.png`, png(n, n, to8(m.rough), 1, z));
  put(`${name}_metallic.png`, png(n, n, to8(m.metal), 1, z));
  put(`${name}_ao.png`, png(n, n, to8(m.ao), 1, z));
  // ORM: AO, roughness, metalness in R, G, B (glTF metallicRoughness reads G and B; Unreal reads all three)
  const orm = new Float32Array(n * n * 3);
  for (let i = 0; i < n * n; i++) { orm[i * 3] = m.ao[i]; orm[i * 3 + 1] = m.rough[i]; orm[i * 3 + 2] = m.metal[i]; }
  put(`${name}_orm.png`, png(n, n, to8(orm), 3, z));
  if (m.emit) put(`${name}_emissive.png`, png(n, n, to8(m.emit), 3, z));
  void flipG;
  return files;
}

export function writeOutputs(p: Project, out: string, opts: OutputOptions = {}): OutputResult {
  const r: OutputResult = { written: [], errors: [], lines: [] };
  for (const name of p.order) {
    if (opts.only && !opts.only.includes(name)) continue;
    try {
      const def = p.materials.get(name)!, m = p.build(name, opts.size), flipG = def.opts.normal === "dx" ? -1 : 1;
      const dir = join(out, name);
      r.written.push(...writeMaps(name, m, dir, flipG));
      const seam = seamScore(m);
      const manifest = {
        name, size: m.n, normal: def.opts.normal ?? "gl", depth: def.opts.depth ?? 0.04, seam,
        maps: { albedo: `${name}_albedo.png`, normal: `${name}_normal.png`, height: `${name}_height.png`, roughness: `${name}_roughness.png`,
          metallic: `${name}_metallic.png`, ao: `${name}_ao.png`, orm: `${name}_orm.png`, emissive: m.emit ? `${name}_emissive.png` : null },
      };
      writeFileSync(join(dir, `${name}.material.json`), JSON.stringify(manifest, null, 1) + "\n");
      r.written.push(join(dir, `${name}.material.json`));
      if (opts.preview !== false) {
        mkdirSync(join(out, "_preview"), { recursive: true });
        writeFileSync(join(out, "_preview", ".gdignore"), "");   // Godot skips the previews
        const pv = join(out, "_preview", `${name}.png`);
        writeFileSync(pv, previewSheet(name, m, seam, flipG));
        r.written.push(pv);
      }
      r.lines.push(`material ${name}: ${m.n}×${m.n}, ${seam.worst <= 1.5 ? "seamless" : `SEAM ${seam.worst}× in ${seam.map}`}`);
    } catch (e) {
      r.errors.push(wrap(e, (s) => p.locFromStack(s)));
    }
  }
  return r;
}
