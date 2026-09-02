import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".webp") || f.endsWith(".jpg")).sort();

for (const f of files) {
  const { data, info } = await sharp(path.join(dir, f))
    .resize({ width: 220, height: 220, fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const y0 = Math.floor(H * 0.06), y1 = Math.floor(H * 0.58);
  const Hc = y1 - y0;
  const darkB = Buffer.from(data); // reuse
  const isDark = (x, y) => darkB[y * W + x] < 55;

  // Find strong dark connected components using BFS-flood via stack.
  const seen = new Uint8Array(W * Hc);
  const comps = [];
  const stack = [];
  for (let i = 0; i < W * Hc; i++) {
    const sx = i % W, sy = (i / W) | 0;
    if (!seen[i] && isDark(sx, sy + y0)) {
      let area = 0, minX = W, maxX = 0, minY = Hc, maxY = 0, cxSum = 0, cySum = 0;
      stack.length = 0; stack.push(i); seen[i] = 1;
      while (stack.length) {
        const p = stack.pop();
        const px = p % W, py = (p / W) | 0;
        area++; cxSum += px; cySum += py;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const qx = px + dx, qy = py + dy;
          if (qx < 0 || qx >= W || qy < 0 || qy >= Hc) continue;
          const q = qy * W + qx;
          if (!seen[q] && isDark(qx, qy + y0)) { seen[q] = 1; stack.push(q); }
        }
      }
      comps.push({ area, minX, maxX, minY, maxY, ccx: cxSum / area, ccy: cySum / area + y0 });
    }
  }

  // Wheel ring test: for each candidate, sample the bbox; a steering wheel has a
  // RING (dark outer rim, lighter/empty center). Compute center fill: fraction
  // of central 40% bbox that is dark. Ring => low center fill; solid => high.
  const wheels = [];
  for (const c of comps) {
    const w = c.maxX - c.minX, h = c.maxY - c.minY;
    const bw = w + 1, bh = h + 1;
    if (bw < W * 0.10 || bw > W * 0.6 || bh > H * 0.6) continue;
    if (bw / Math.max(1, bh) < 0.55 || bw / Math.max(1, bh) > 1.9) continue;
    const fill = c.area / (bw * bh);
    if (fill < 0.2 || fill > 0.96) continue;
    // center fill
    const cx0 = c.minX + Math.floor(bw * 0.28), cx1 = c.minX + Math.floor(bw * 0.72);
    const cy0 = c.minY + Math.floor(bh * 0.28), cy1 = c.minY + Math.floor(bh * 0.72);
    let centerDark = 0, centerTot = 0;
    for (let y = cy0; y <= cy1 && y < Hc; y++) for (let x = cx0; x <= cx1 && x < W; x++) {
      centerTot++; if (isDark(x, y + y0)) centerDark++;
    }
    const centerFill = centerTot ? centerDark / centerTot : 1;
    wheels.push({ ...c, fill, centerFill, rim: 1 - centerFill });
  }
  wheels.sort((a, b) => b.rim - a.rim);

  if (!wheels.length) { console.log(`${f.padEnd(9)} no-wheel`); continue; }
  const top = wheels[0];
  const cx = top.ccx / W;
  const side = cx < 0.40 ? "LEFT" : cx > 0.60 ? "RIGHT" : "CENTER";
  console.log(`${f.padEnd(9)} wheel rim=${top.rim.toFixed(2)} fill=${top.fill.toFixed(2)} cx=${cx.toFixed(2)} ${side}`);
}
