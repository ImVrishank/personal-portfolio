// Generated line illustrations, one per project / AI entry. Each returns the inner SVG for a 200x124 canvas.
// Strokes use currentColor; .sig-s / .sig-f are the warm accent (stroke / fill), .plot-s the blue accent.
const f = (n) => Math.round(n * 10) / 10;

/* a curl of stacked disks, like the SpiRobs arm: width falls toward the tip, bend grows toward the tip */
function spiral(x0, y0, len, curl, scale = 1, tipTarget = false) {
  const N = 22; let x = x0, y = y0, a = -Math.PI / 2, out = '';
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1), w = (13 - 10 * u) * scale, k = curl * (0.2 + 1.5 * u * u);
    a += k; const step = len / N; x += Math.cos(a) * step; y += Math.sin(a) * step;
    const nx = Math.cos(a + Math.PI / 2) * w / 2, ny = Math.sin(a + Math.PI / 2) * w / 2;
    out += `<path d="M${f(x - nx)} ${f(y - ny)}L${f(x + nx)} ${f(y + ny)}" stroke-width="${i > N - 4 ? 2.4 : 1.7}" ${i > N - 4 ? 'class="sig-s"' : ''}/>`;
  }
  const tip = `<circle cx="${f(x)}" cy="${f(y)}" r="3.4" class="sig-f"/>`;
  return { svg: out + tip, x, y };
}

export const ART = {
  spirobs() {
    const s = spiral(78, 112, 96, 0.17, 1.15);
    return `<ellipse cx="78" cy="116" rx="24" ry="4.5" opacity=".5"/>${s.svg}<circle cx="150" cy="40" r="8" opacity=".55" stroke-dasharray="2 3"/><path d="M150 28v8M150 44v8M138 40h8M154 40h8" opacity=".55"/>`;
  },
  'spirobs-rl'() { // the same arm reaching for a target, with a small reward curve
    const s = spiral(64, 112, 92, 0.15, 1);
    return `${s.svg}<circle cx="146" cy="32" r="9" stroke-dasharray="2 3"/><circle cx="146" cy="32" r="2.4" class="sig-f"/><path d="M146 17v8M146 39v8M131 32h8M153 32h8"/>`
      + `<path d="M120 100c10 0 8-26 22-26s12 18 24 18 10-8 22-10" fill="none" class="plot-s" stroke-width="1.8"/><path d="M118 108h74M118 108V66" opacity=".5"/>`;
  },
  sesame() { // quadruped, side view, with an OLED face
    const leg = (x, y, k) => `<path d="M${x} ${y}L${x + k * 9} ${y + 20}L${x + k * 2} ${y + 40}" fill="none" stroke-width="2.4"/><circle cx="${x}" cy="${y}" r="3.4" fill="var(--bg)"/><circle cx="${x + k * 9}" cy="${y + 20}" r="2.6" fill="var(--bg)"/><path d="M${x + k * 2 - 4} ${y + 40}h8" stroke-width="2.4"/>`;
    return `<rect x="52" y="34" width="92" height="30" rx="9"/><rect x="144" y="28" width="30" height="26" rx="7"/><rect x="150" y="34" width="18" height="12" rx="2" class="sig-s"/><circle cx="155" cy="40" r="1.8" class="sig-f"/><circle cx="163" cy="40" r="1.8" class="sig-f"/>`
      + leg(68, 64, -1) + leg(84, 64, 1) + leg(118, 64, -1) + leg(134, 64, 1)
      + `<path d="M62 46h38M62 54h26" opacity=".45"/><path d="M40 112h130" opacity=".35"/><path d="M52 48c-10-2-14-10-14-16" fill="none"/>`;
  },
  'edge-ai'() { // camera frame, detection box, chip
    return `<rect x="22" y="22" width="104" height="76" rx="6"/><path d="M22 80l26-22 20 16 22-26 36 32" fill="none" opacity=".5"/><circle cx="44" cy="42" r="6" opacity=".5"/>`
      + `<rect x="62" y="40" width="46" height="44" rx="3" class="sig-s" stroke-dasharray="5 3"/><path d="M62 34h30" class="sig-s"/>`
      + `<rect x="144" y="46" width="34" height="34" rx="4"/>` + [52, 60, 68, 76].map((y) => `<path d="M138 ${y}h6M178 ${y}h6"/>`).join('') + `<path d="M126 62h12" class="sig-s"/><circle cx="161" cy="63" r="5" class="sig-f"/>`;
  },
  'mars-uav'() { // quadcopter, top view, over a survey path
    const rot = (x, y) => `<circle cx="${x}" cy="${y}" r="15" opacity=".6"/><circle cx="${x}" cy="${y}" r="2.4"/>`;
    return `<path d="M30 104c24 0 24-20 48-20s24 20 48 20 24-20 44-20" fill="none" stroke-dasharray="3 4" opacity=".55"/>`
      + `<path d="M84 44l32 28M116 44L84 72" stroke-width="3"/>` + rot(84, 44) + rot(116, 44) + rot(84, 72) + rot(116, 72)
      + `<rect x="92" y="52" width="16" height="12" rx="3" class="sig-f"/>`;
  },
  gpt2() { // tokens, attention arcs, stacked blocks
    const xs = [30, 64, 98, 132, 166];
    return xs.map((x) => `<rect x="${x - 13}" y="86" width="26" height="14" rx="3"/><rect x="${x - 13}" y="24" width="26" height="14" rx="3"/>`).join('')
      + `<path d="M30 86Q64 56 98 86M64 86Q98 52 132 86M98 86Q132 56 166 86" fill="none" class="sig-s"/><path d="M132 86Q98 62 64 86" fill="none" opacity=".45"/>`
      + xs.map((x) => `<path d="M${x} 38v10M${x} 76v10" opacity=".5"/>`).join('') + `<rect x="22" y="48" width="156" height="28" rx="5" stroke-dasharray="3 4" opacity=".6"/><text x="100" y="66" text-anchor="middle" class="art-t" style="font-size:9px">DECODER x N</text>`;
  },
  bpe() { // characters merging into tokens
    const row = (y, chunks) => { let x = 24, o = ''; for (const [t, hl] of chunks) { const w = t.length * 11 + 8; o += `<rect x="${x}" y="${y}" width="${w}" height="20" rx="4" ${hl ? 'class="sig-s"' : ''}/><text x="${x + w / 2}" y="${y + 14}" text-anchor="middle" class="art-t" style="font-size:11px">${t}</text>`; x += w + 5; } return o; };
    return row(14, [['l'], ['o'], ['w'], ['e'], ['r']]) + `<path d="M100 38v10M96 44l4 5 4-5" opacity=".6"/>` + row(54, [['lo', 1], ['w'], ['e'], ['r']]) + `<path d="M100 78v10M96 84l4 5 4-5" opacity=".6"/>` + row(94, [['low', 1], ['er', 1]]);
  },
  word2vec() { // vectors in a plane, king - man + woman = queen
    return `<path d="M24 104h152M24 104V16" opacity=".4"/>`
      + `<path d="M54 90L84 40" stroke-width="1.8"/><path d="M110 96L140 46" stroke-width="1.8"/><path d="M54 90L110 96M84 40L140 46" stroke-dasharray="3 3" opacity=".6"/>`
      + [[54, 90, 'man'], [84, 40, 'king'], [110, 96, 'woman']].map(([x, y, t]) => `<circle cx="${x}" cy="${y}" r="4.4" fill="var(--bg)"/><text x="${x + 7}" y="${y + 4}" class="art-t" style="font-size:9px">${t}</text>`).join('')
      + `<circle cx="140" cy="46" r="5" class="sig-f"/><text x="148" y="50" class="art-t" style="font-size:9px">queen</text>`
      + [[40, 30], [150, 82], [168, 64], [30, 60], [120, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" opacity=".45"/>`).join('');
  },
  'naive-bayes'() { // two class histograms and an envelope
    const bars = (x0, hs, cls) => hs.map((h, i) => `<rect x="${x0 + i * 11}" y="${100 - h}" width="9" height="${h}" ${cls}/>`).join('');
    return `<path d="M20 100h100" opacity=".5"/>` + bars(24, [10, 22, 40, 52, 34, 16], 'opacity=".75"') + bars(72, [6, 12, 20, 30, 42, 28], 'class="sig-s"')
      + `<rect x="130" y="34" width="52" height="36" rx="4"/><path d="M130 38l26 20 26-20" fill="none" class="sig-s"/><path d="M150 84h12M146 92h20" opacity=".5"/>`;
  },
  braincells() { return ART['nn'](); },
  nn() { // the layered network the owner liked
    const cols = [3, 5, 5, 3], xs = [34, 80, 120, 166], pts = cols.map((c, ci) => Array.from({ length: c }, (_, j) => [xs[ci], 62 + (j - (c - 1) / 2) * 17]));
    return pts.slice(1).map((col, ci) => col.map((b, bi) => pts[ci].map((a, ai) => `<path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke-width=".6" opacity="${0.22 + ((ci * 7 + bi * 3 + ai) % 5) / 10}"/>`).join('')).join('')).join('')
      + pts.map((col, ci) => col.map((q, j) => `<circle cx="${q[0]}" cy="${q[1]}" r="4.6" ${ci === 3 && j === 1 ? 'class="sig-f"' : 'fill="var(--bg)"'}/>`).join('')).join('');
  },
  'from-scratch'() { // a perceptron separating two clouds
    const A = [[40, 36], [58, 50], [34, 62], [70, 34], [52, 72], [80, 56]], B = [[120, 78], [140, 62], [158, 84], [132, 98], [166, 70], [110, 96]];
    return A.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="var(--bg)"/>`).join('') + B.map(([x, y]) => `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" class="sig-f"/>`).join('')
      + `<path d="M64 112L132 18" class="sig-s" stroke-width="2"/><path d="M102 74l-9-8m9 8l8 9" opacity=".5"/><text x="150" y="30" class="art-t" style="font-size:10px">w·x + b = 0</text>`;
  },
  bandit() { // four prompt variants as posterior curves, one wins
    const bell = (cx, w, h, cls, dash = '') => `<path d="M${cx - w} 100C${cx - w / 2} 100 ${cx - w / 3} ${100 - h} ${cx} ${100 - h}S${cx + w / 2} 100 ${cx + w} 100" fill="none" ${cls} ${dash}/>`;
    return `<path d="M18 100h164" opacity=".5"/>` + bell(52, 28, 20, 'opacity=".5"') + bell(80, 26, 30, 'opacity=".6"') + bell(108, 24, 36, 'opacity=".7"') + bell(144, 20, 66, 'class="sig-s" stroke-width="2.2"')
      + `<path d="M144 34v-8" class="sig-s"/><circle cx="144" cy="22" r="3.4" class="sig-f"/><path d="M26 18h24l6-7 6 14 5-7h18" fill="none" opacity=".45"/>`;
  },
  jetson() { return ART['edge-ai'](); },
};
export const hasArt = (k) => !!ART[k];
