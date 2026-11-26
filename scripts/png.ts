// A small PNG reader for npm run verify's picture checks: Chrome's screenshots are 8-bit, not
// interlaced, RGB or RGBA. Nothing else is supported, and nothing else is needed.
import { inflateSync } from "node:zlib";

export interface Pixels {
  width: number;
  height: number;
  /** RGBA, 4 bytes a pixel, row by row. */
  data: Uint8Array;
}

/** The Paeth predictor from the PNG spec: whichever of left, up and up-left is closest to their estimate. */
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);

  if (pa <= pb && pa <= pc) {
    return a;
  }

  return pb <= pc ? b : c;
}

export function decodePng(file: Uint8Array): Pixels {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Array<Uint8Array> = [];

  for (let at = 8; at < file.length;) {
    const length = view.getUint32(at);
    const type = String.fromCodePoint(...file.subarray(at + 4, at + 8));
    const body = file.subarray(at + 8, at + 8 + length);

    if (type === "IHDR") {
      width = view.getUint32(at + 8);
      height = view.getUint32(at + 12);
      const [depth, colour] = body.subarray(8, 10);
      const interlace = body.at(12);

      if (depth !== 8 || interlace !== 0 || (colour !== 2 && colour !== 6)) {
        throw new Error(`decodePng: only 8-bit RGB or RGBA without interlacing (depth ${depth}, colour type ${colour})`);
      }

      channels = colour === 6 ? 4 : 3;
    } else if (type === "IDAT") {
      idat.push(body);
    }

    at += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows = new Uint8Array(stride * height);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = y * stride;

    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? rows[out + x - channels] : 0;
      const up = y > 0 ? rows[out - stride + x] : 0;
      const upLeft = x >= channels && y > 0 ? rows[out - stride + x - channels] : 0;
      const predicted = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter] ?? 0;
      rows[out + x] = (line[x] + predicted) & 255;
    }
  }

  if (channels === 4) {
    return { width, height, data: rows };
  }

  const data = new Uint8Array(width * height * 4);

  for (let i = 0, j = 0; i < rows.length; i += 3, j += 4) {
    data[j] = rows[i];
    data[j + 1] = rows[i + 1];
    data[j + 2] = rows[i + 2];
    data[j + 3] = 255;
  }

  return { width, height, data };
}

/** sRGB channel (0–255) to linear light, for relative luminance. */
const LINEAR = Array.from({ length: 256 }, (_, v) => {
  const c = v / 255;

  return c <= 0.04 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

/** A picture as a `cols`×`rows` grid of relative luminance (0 black to 1 white), each cell the mean of its pixels. */
export interface Grid {
  cols: number;
  rows: number;
  cells: Float64Array;
}

export function luminanceGrid(pixels: Pixels, cols: number, rows: number): Grid {
  const cells = new Float64Array(cols * rows);
  const counts = new Float64Array(cols * rows);

  for (let y = 0; y < pixels.height; y++) {
    const row = Math.min(rows - 1, Math.floor((y * rows) / pixels.height));

    for (let x = 0; x < pixels.width; x++) {
      const i = (y * pixels.width + x) * 4;
      const cell = row * cols + Math.min(cols - 1, Math.floor((x * cols) / pixels.width));
      cells[cell] += 0.2126 * LINEAR[pixels.data[i]] + 0.7152 * LINEAR[pixels.data[i + 1]] + 0.0722 * LINEAR[pixels.data[i + 2]];
      counts[cell] += 1;
    }
  }

  for (let c = 0; c < cells.length; c++) {
    cells[c] /= counts[c] || 1;
  }

  return { cols, rows, cells };
}

/** How far apart two grids of the same size are: the mean change, and the share of cells that changed by more than `big`. */
export interface Diff {
  /** The mean change in a cell's luminance. */
  mean: number;
  /** The share of cells that changed by more than `big`. */
  changed: number;
}

export function gridDiff(a: Grid, b: Grid, big = 0.1): Diff {
  let sum = 0;
  let changed = 0;

  for (let c = 0; c < a.cells.length; c++) {
    const d = Math.abs(a.cells[c] - b.cells[c]);
    sum += d;
    changed += d > big ? 1 : 0;
  }

  return { mean: sum / a.cells.length, changed: changed / a.cells.length };
}

/** The mean luminance of each tile when the grid is cut into `n`×`n` tiles. */
export function tiles(grid: Grid, n: number): Array<number> {
  const out = Array.from({ length: n * n }, () => 0);
  const counts = Array.from({ length: n * n }, () => 0);

  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      const t = Math.floor((y * n) / grid.rows) * n + Math.floor((x * n) / grid.cols);
      out[t] += grid.cells[y * grid.cols + x];
      counts[t] += 1;
    }
  }

  return out.map((v, t) => v / (counts[t] || 1));
}

/** Where two grids differ by more than `big`, as a box in fractions of the picture (0–1), or null. */
export function changedBox(a: Grid, b: Grid, big = 0.1): { left: number; top: number; right: number; bottom: number } | null {
  let [left, top, right, bottom] = [1, 1, 0, 0];

  for (let y = 0; y < a.rows; y++) {
    for (let x = 0; x < a.cols; x++) {
      if (Math.abs(a.cells[y * a.cols + x] - b.cells[y * a.cols + x]) > big) {
        left = Math.min(left, x / a.cols);
        top = Math.min(top, y / a.rows);
        right = Math.max(right, (x + 1) / a.cols);
        bottom = Math.max(bottom, (y + 1) / a.rows);
      }
    }
  }

  return right > 0 ? { left, top, right, bottom } : null;
}
