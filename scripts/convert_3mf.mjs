/**
 * convert_3mf.mjs
 * Converts .3mf files to compact binary geometry for web display.
 *
 * Output format per file (models/animals/web/<NAME>.bin):
 *   [vertexCount: uint32][indexCount: uint32]
 *   [x,y,z: float32 * vertexCount * 3]
 *   [i0,i1,i2: uint32 * indexCount]
 *
 * Usage: node scripts/convert_3mf.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { inflateRawSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = join(fileURLToPath(import.meta.url), '../..');
const INPUT_DIR = join(__dir, 'models/animals');
const OUTPUT_DIR = join(__dir, 'models/animals/web');

const MODELS = [
  { input: 'COW.3mf',       output: 'COW.bin' },
  { input: 'IBEX.3mf',      output: 'IBEX.bin' },
  { input: 'WOLF V3.3mf',   output: 'WOLF.bin' },
  { input: 'SHEEP V3.3mf',  output: 'SHEEP.bin' },
];

// Target ~60k triangles for smooth but fast web display
const TARGET_TRIS = 60_000;

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── ZIP reader ───────────────────────────────────────────────────────────────

function readZipEntries(buf) {
  let eocdPos = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf[i] === 0x50 && buf[i+1] === 0x4b && buf[i+2] === 0x05 && buf[i+3] === 0x06) {
      eocdPos = i; break;
    }
  }
  if (eocdPos < 0) throw new Error('EOCD not found');

  const cdOffset = buf.readUInt32LE(eocdPos + 16);
  const cdEntries = buf.readUInt16LE(eocdPos + 8);

  const entries = [];
  let pos = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    const compression     = buf.readUInt16LE(pos + 10);
    const compressedSize  = buf.readUInt32LE(pos + 20);
    const uncompressedSize= buf.readUInt32LE(pos + 24);
    const filenameLen     = buf.readUInt16LE(pos + 28);
    const extraLen        = buf.readUInt16LE(pos + 30);
    const commentLen      = buf.readUInt16LE(pos + 32);
    const localOff        = buf.readUInt32LE(pos + 42);
    const name            = buf.slice(pos + 46, pos + 46 + filenameLen).toString('utf8');
    entries.push({ name, compression, compressedSize, uncompressedSize, localOff });
    pos += 46 + filenameLen + extraLen + commentLen;
  }
  return entries;
}

function extractEntry(buf, entry) {
  const lfhFilenameLen = buf.readUInt16LE(entry.localOff + 26);
  const lfhExtraLen    = buf.readUInt16LE(entry.localOff + 28);
  const dataStart = entry.localOff + 30 + lfhFilenameLen + lfhExtraLen;
  const raw = buf.slice(dataStart, dataStart + entry.compressedSize);
  return entry.compression === 0 ? raw : inflateRawSync(raw);
}

// ─── 3MF XML geometry parser ─────────────────────────────────────────────────

function parseGeometry(xmlBuf) {
  const xml = xmlBuf.toString('utf8');

  const rawVerts = [];
  const rawTris = [];

  // Regex-based streaming parse (faster than DOM for huge files)
  const vRe = /x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
  let m;
  while ((m = vRe.exec(xml)) !== null) {
    rawVerts.push(+m[1], +m[2], +m[3]);
  }

  const tRe = /v1="([^"]+)"\s+v2="([^"]+)"\s+v3="([^"]+)"/g;
  while ((m = tRe.exec(xml)) !== null) {
    rawTris.push(+m[1], +m[2], +m[3]);
  }

  return { rawVerts, rawTris };
}

// ─── Grid decimation ─────────────────────────────────────────────────────────
// Maps vertices to a voxel grid and keeps one vertex per cell.
// Then rebuilds triangles, discarding degenerate ones.

function decimate(rawVerts, rawTris, gridRes = 200) {
  const numVerts = rawVerts.length / 3;
  const numTris  = rawTris.length / 3;

  // Bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < rawVerts.length; i += 3) {
    const x = rawVerts[i], y = rawVerts[i+1], z = rawVerts[i+2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }

  const rx = maxX - minX || 1, ry = maxY - minY || 1, rz = maxZ - minZ || 1;
  const G = gridRes - 1;

  // Map each original vertex → grid cell key → new index
  const cellToIdx = new Map();
  const newVerts = [];
  const vertToNew = new Int32Array(numVerts);

  for (let i = 0; i < numVerts; i++) {
    const x = rawVerts[i*3], y = rawVerts[i*3+1], z = rawVerts[i*3+2];
    const gx = Math.round(((x - minX) / rx) * G);
    const gy = Math.round(((y - minY) / ry) * G);
    const gz = Math.round(((z - minZ) / rz) * G);
    const key = gx * gridRes * gridRes + gy * gridRes + gz;

    if (cellToIdx.has(key)) {
      vertToNew[i] = cellToIdx.get(key);
    } else {
      const idx = newVerts.length / 3;
      cellToIdx.set(key, idx);
      vertToNew[i] = idx;
      newVerts.push(x, y, z);
    }
  }

  // Rebuild index buffer, skip degenerate triangles
  const newTris = [];
  for (let i = 0; i < numTris; i++) {
    const a = vertToNew[rawTris[i*3]];
    const b = vertToNew[rawTris[i*3+1]];
    const c = vertToNew[rawTris[i*3+2]];
    if (a !== b && b !== c && a !== c) {
      newTris.push(a, b, c);
    }
  }

  return { verts: newVerts, tris: newTris };
}

// ─── Binary writer ────────────────────────────────────────────────────────────

function writeBin(verts, tris, outPath) {
  const vertCount = verts.length / 3;
  const idxCount  = tris.length;
  const buf = Buffer.allocUnsafe(8 + vertCount * 12 + idxCount * 4);
  let off = 0;
  buf.writeUInt32LE(vertCount, off); off += 4;
  buf.writeUInt32LE(idxCount,  off); off += 4;
  for (const v of verts) { buf.writeFloatLE(v, off); off += 4; }
  for (const i of tris)  { buf.writeUInt32LE(i, off); off += 4; }
  writeFileSync(outPath, buf);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

for (const model of MODELS) {
  const inPath  = join(INPUT_DIR, model.input);
  const outPath = join(OUTPUT_DIR, model.output);

  console.log(`\n→ ${model.input}`);
  const zipBuf = readFileSync(inPath);

  const entries = readZipEntries(zipBuf);
  console.log('  ZIP entries:', entries.map(e => e.name).join(', '));

  // Find the largest .model file (the actual geometry)
  const geoEntry = entries
    .filter(e => e.name.endsWith('.model'))
    .sort((a, b) => b.compressedSize - a.compressedSize)[0];

  if (!geoEntry) { console.warn('  No .model entry found, skipping'); continue; }
  console.log(`  Geometry entry: ${geoEntry.name} (${(geoEntry.compressedSize/1024/1024).toFixed(1)}MB compressed → ${(geoEntry.uncompressedSize/1024/1024).toFixed(1)}MB)`);

  console.log('  Inflating...');
  const xmlBuf = extractEntry(zipBuf, geoEntry);
  console.log(`  Inflated: ${(xmlBuf.length/1024/1024).toFixed(1)}MB`);

  console.log('  Parsing geometry...');
  const { rawVerts, rawTris } = parseGeometry(xmlBuf);
  console.log(`  Raw: ${rawVerts.length/3} verts, ${rawTris.length/3} tris`);

  // Choose grid resolution to approximate TARGET_TRIS
  // Grid decimation reduces triangles by factor ~(rawTris/TARGET_TRIS)
  // We use gridRes to control this
  const ratio = rawTris.length / 3 / TARGET_TRIS;
  const gridRes = Math.max(50, Math.min(300, Math.round(200 / Math.cbrt(ratio))));
  console.log(`  Decimating with grid ${gridRes}³ (target ~${TARGET_TRIS} tris)...`);

  const { verts, tris } = decimate(rawVerts, rawTris, gridRes);
  console.log(`  Decimated: ${verts.length/3} verts, ${tris.length/3} tris`);

  writeBin(verts, tris, outPath);
  const sizeMB = (8 + verts.length*4 + tris.length*4) / 1024 / 1024;
  console.log(`  Saved: ${outPath} (${sizeMB.toFixed(2)}MB)`);
}

console.log('\nDone.');
