// Home boot: decides between the WebGL scenes and the static illustrated panels.
// The inline head script sets html.con-3d only when WebGL2 exists and the visitor
// has not asked for reduced motion. three.js is imported after first paint.
const V = '20261109c';
const GSAP = 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/';
const root = document.documentElement;

function loadScript(src) {
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = ok; s.onerror = ko;
    document.head.appendChild(s);
  });
}

function giveUp(err) {
  root.classList.remove('con-3d');
  root.classList.add('sin-3d');
  if (err && window.console) console.info('[home] static panels shown:', err.message || err);
}

async function start() {
  const section = document.querySelector('.escenas');
  const canvas = document.getElementById('lienzo');
  if (!section || !canvas) return;
  try {
    await loadScript(GSAP + 'gsap.min.js');
    await loadScript(GSAP + 'ScrollTrigger.min.js');
    const { createWorld } = await import(`./world.js?v=${V}`);
    const { createSequences } = await import(`./secuencia.js?v=${V}`);
    const css = getComputedStyle(root);
    const paper = () => (getComputedStyle(document.body).backgroundColor || css.getPropertyValue('--papel') || '#f3ece1').trim();
    // the sticky site header sits above the narrow-screen scene band
    const hdr = document.querySelector('.site-header');
    const setHdr = () => root.style.setProperty('--hdr', (hdr ? hdr.offsetHeight : 0) + 'px');
    setHdr();
    const world = createWorld(canvas, [...document.querySelectorAll('.pin')], { background: paper() });
    const gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);

    const articles = [...section.querySelectorAll('.escena')];
    const seq = createSequences(section.querySelector('.escenario'), articles, V);
    let target = 0, current = 0;
    ST.create({
      trigger: section, start: 'top top', end: 'bottom bottom',
      onUpdate() { target = progress(); },
    });
    // Scene index plus local progress, read from each article's box so articles may differ in height.
    function progress() {
      const vh = innerHeight, narrow = innerWidth < 900;
      const band = narrow ? section.querySelector('.escenario').getBoundingClientRect().bottom : vh * 0.5;
      let p = 0;
      for (let i = 0; i < articles.length; i++) {
        const r = articles[i].getBoundingClientRect();
        // a scene hands over when the next text reaches the band (narrow) or mid-screen (wide)
        const lead = narrow ? band : i === 0 ? 0 : band;
        const last = i === articles.length - 1;
        const span = narrow ? (last ? Math.max(1, r.height - (vh - band)) : r.height)
          : i === 0 ? r.height - vh * 0.5 : last ? Math.max(1, r.height - vh) : r.height;
        if (i === 0 || r.top <= lead) p = i + Math.min(1, Math.max(0, (lead - r.top) / span));
      }
      const idx = Math.min(5, Math.floor(p + 0.06));
      articles.forEach((a, i) => a.classList.toggle('es-activa', i === idx));
      return p;
    }
    target = current = progress();

    let visible = false, raf = 0, last = performance.now(), time = 0;
    // Watch frame cost: step quality down on slow devices, and fall back to the
    // static panels if even the lightest mode cannot keep up (?3d=1 keeps 3D for testing).
    let q = 2, frames = 0, t0 = 0, tuned = false;
    const keep = /[?&]3d=1/.test(location.search);
    if (keep) tuned = true;
    function tune(now) {
      if (tuned) return;
      frames++;
      if (frames === 15) t0 = now;
      if (frames < 75) return;
      const ms = (now - t0) / 60;
      frames = 0;
      if (ms > 40 && q > 0) { q--; world.setQuality(q); }
      else if (ms > 150 && q === 0 && !keep) { visible = false; cancelAnimationFrame(raf); giveUp(new Error('frame time ' + ms.toFixed(0) + ' ms')); }
      else tuned = true;
    }
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
      current += (target - current) * Math.min(1, dt * 6);
      seq.update(world.update(current, time));
      world.render();
      tune(now);
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!root.classList.contains('con-3d')) return; if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }, { rootMargin: '100px' }).observe(section);
    document.addEventListener('visibilitychange', kick);
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { setHdr(); world.resize(); ST.refresh(); }, 120); });
    window.addEventListener('bt-theme-change', () => setTimeout(() => world.setBackground(paper()), 50));
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => { if (e.matches) { cancelAnimationFrame(raf); visible = false; giveUp(); } });
    window.__home = { world, seq, get p() { return current; }, get q() { return q; },
      // test hook: settle the scroll target, render once, stop the loop
      still() { current = target = progress(); visible = false; cancelAnimationFrame(raf); raf = 0; seq.update(world.update(current, time)); world.render(); return current; } };
    root.classList.add('escena-lista');
  } catch (err) {
    giveUp(err);
  }
}

if (root.classList.contains('con-3d')) {
  const go = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1200 }) : setTimeout(start, 200));
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
}
