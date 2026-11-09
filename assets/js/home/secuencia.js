// Scroll-scrubbed Blender renders for scenes 1 (cupping), 2 (grinders), 3 (drying beds) and 4 (brewing methods).
// A scene is a list of segments; each segment is its own muted H.264 video (keyframe every 12 frames,
// no B-frames) laid over the WebGL canvas, so one segment can be re-rendered and re-encoded alone
// (see beantage-work/blender/escena-2-web/README.md). The scene scroll progress picks the segment and
// sets video.currentTime. Videos are requested only when the article is about one screen away, and a
// WebP poster shows until the first one can play.
// frames = number of rendered frames in the segment (24 fps); update it if a segment changes length.
const SCENES = {
  // cupping: camera push, then the spoon breaks the crust (beantage-work/blender/escena-1-web/README.md)
  0: { base: '/assets/video/escena-1-cata', segs: [
    { id: 'seg1-acercamiento', frames: 36 },
    { id: 'seg2-romper', frames: 48 },
  ] },
  3: { base: '/assets/video/escena-4-metodos', segs: [
    { id: 'seg1-recorrido', frames: 36 },
    { id: 'seg2-asentar', frames: 36 },
  ] },
  1: { base: '/assets/video/escena-2-molinos', segs: [
    { id: 'seg1-orbita', frames: 36 },
    { id: 'seg2-despiece-comandante', frames: 24 },
    { id: 'seg3-despiece-pietro', frames: 24 },
    { id: 'seg4-muelas', frames: 24 },
    { id: 'seg5-molienda-reservado', frames: 12 },
  ] },
  2: { base: '/assets/video/escena-3-procesos', segs: [{ id: 'camas', frames: 48 }] },
};
const FPS = 24;

export function createSequences(stage, articles, v) {
  const box = document.createElement('div');
  box.className = 'secuencias';
  stage.insertBefore(box, stage.querySelector('.pines'));
  const r = stage.getBoundingClientRect();
  // the narrow layout shows a short, almost square band: use the square cut there
  const cut = r.width / Math.max(1, r.height) > 1.25 ? 'wide' : 'square';
  const scenes = new Map();
  for (const [idx, cfg] of Object.entries(SCENES)) {
    let start = 0;
    const sc = { loaded: false, total: cfg.segs.reduce((n, g) => n + g.frames, 0), segs: [], cur: -1 };
    cfg.segs.forEach((g, k) => {
      const vid = document.createElement('video');
      vid.className = 'secuencia';
      vid.muted = true; vid.playsInline = true; vid.preload = 'none';
      vid.setAttribute('muted', ''); vid.setAttribute('playsinline', ''); vid.setAttribute('aria-hidden', 'true');
      vid.disablePictureInPicture = true;
      if (k === 0) vid.poster = `${cfg.base}-${cut}-poster.webp?v=${v}`;
      vid.dataset.escena = idx; vid.dataset.seg = g.id;
      box.appendChild(vid);
      const s = { vid, start, frames: g.frames, src: `${cfg.base}-${g.id}-${cut}.mp4?v=${v}`, want: 0, dur: 0 };
      vid.addEventListener('loadedmetadata', () => { s.dur = vid.duration || 0; seek(s); });
      vid.addEventListener('seeked', () => seek(s));
      sc.segs.push(s);
      start += g.frames;
    });
    scenes.set(Number(idx), sc);
  }
  function load(sc) {
    if (sc.loaded) return;
    sc.loaded = true;
    sc.segs.forEach((s) => { s.vid.preload = 'auto'; s.vid.src = s.src; s.vid.load(); });
  }
  // lazy load: start fetching when the scene is one screen away
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const sc = scenes.get(Number(e.target.dataset.escena)); if (sc) load(sc);
  }), { rootMargin: '100% 0px 100% 0px' });
  articles.forEach((a) => { if (scenes.has(Number(a.dataset.escena))) io.observe(a); });

  // keep at most one seek in flight per video; the latest wanted time wins
  function seek(s) {
    if (!s.dur || s.vid.seeking) return;
    const t = Math.min(s.dur - 0.001, Math.max(0, s.want));
    if (Math.abs(s.vid.currentTime - t) > 0.02) s.vid.currentTime = t;
  }
  function update(state) {
    scenes.forEach((sc, idx) => {
      const on = state.video && state.show === idx;
      if (!on) { sc.segs.forEach((s) => { s.vid.style.opacity = '0'; }); sc.cur = -1; return; }
      load(sc);
      // global frame position, then the segment that owns it (the gap between two segments holds the last frame)
      const p = Math.min(1, state.t / 0.88) * (sc.total - 1);
      let k = 0;
      sc.segs.forEach((s, j) => { if (s.start <= p) k = j; });
      const s = sc.segs[k];
      s.want = Math.min(s.frames - 1, p - s.start) / FPS + 0.001;
      sc.segs.forEach((o, j) => { o.vid.style.opacity = j === k ? state.opacity.toFixed(3) : '0'; });
      seek(s);
      sc.cur = k;
    });
  }
  return { update, scenes };
}
