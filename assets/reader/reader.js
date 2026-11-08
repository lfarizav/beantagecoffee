/* Beantage sample reader. Page flip by StPageFlip 2.0.7 (MIT, Nodlik, vendored in ./vendor).
   Markup: <div class="bk" data-dir data-lang data-pages data-w data-h> ... .bk__stage, .bk__prev, .bk__next, .bk__count
   Reduced motion: no flip, the page images are shown as a simple vertical scroll. */
import { PageFlip } from "./vendor/page-flip-2.0.7.module.min.js";

const root = document.querySelector(".bk");
if (root) {
  const lang = root.dataset.lang === "en" ? "en" : "es";
  const T = {
    es: { page: (a, n) => `Página ${a} de ${n}`, pages: (a, b, n) => `Páginas ${a} y ${b} de ${n}`, alt: (i) => `Página ${i} de la muestra`, end: "Fin de la muestra: capítulo 1", endText: "El libro completo es un regalo para quien reserva la experiencia." },
    en: { page: (a, n) => `Page ${a} of ${n}`, pages: (a, b, n) => `Pages ${a} and ${b} of ${n}`, alt: (i) => `Sample page ${i}`, end: "End of the sample: chapter 1", endText: "The full book is a gift for guests who book the experience." }
  }[lang];
  const n = +root.dataset.pages, W = +root.dataset.w || 770, H = +root.dataset.h || 990;
  const base = root.dataset.dir, v = root.dataset.v || "";
  const stage = root.querySelector(".bk__stage");
  const count = root.querySelector(".bk__count");
  const prev = root.querySelector(".bk__prev"), next = root.querySelector(".bk__next");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const src = (i) => `${base}/p-${String(i).padStart(2, "0")}.webp${v}`;

  const mk = (i) => {
    const d = document.createElement("div");
    d.className = "bk__page";
    const im = new Image();
    im.src = src(i); im.alt = T.alt(i); im.width = W; im.height = H;
    im.loading = i <= 4 ? "eager" : "lazy"; im.decoding = "async"; im.draggable = false;
    d.appendChild(im);
    return d;
  };

  if (reduce) {
    root.classList.add("is-scroll");
    for (let i = 1; i <= n; i++) stage.appendChild(mk(i));
    count.textContent = "";
    root.querySelectorAll(".bk__btn").forEach((b) => (b.hidden = true));
  } else {
    root.classList.add("is-flip");
    const pages = [];
    for (let i = 1; i <= n; i++) pages.push(mk(i));
    const end = document.createElement("div");
    end.className = "bk__page bk__end";
    end.innerHTML = `<div><p class="bk__end-t"></p><p class="bk__end-p"></p></div>`;
    end.querySelector(".bk__end-t").textContent = T.end;
    end.querySelector(".bk__end-p").textContent = T.endText;
    pages.push(end);
    const total = pages.length;
    const host = document.createElement("div");
    host.className = "bk__flip";
    stage.appendChild(host);
    const size = () => {
      const w = Math.min(stage.clientWidth, 1100);
      const portrait = w < 700;
      const pw = Math.floor(portrait ? w : w / 2);
      return { pw, ph: Math.round((pw * H) / W) };
    };
    let s = size();
    const pf = new PageFlip(host, {
      width: s.pw, height: s.ph, size: "stretch", minWidth: 200, maxWidth: 770, minHeight: 257, maxHeight: 990,
      maxShadowOpacity: 0.4, showCover: true, usePortrait: true, drawShadow: true,
      flippingTime: 800, mobileScrollSupport: false, swipeDistance: 24
    });
    pf.loadFromHTML(pages);
    const update = () => {
      const i = pf.getCurrentPageIndex();
      const land = pf.getOrientation() === "landscape";
      let txt;
      if (i === 0) txt = T.page(1, n);
      else if (land && i + 1 < n) txt = T.pages(i + 1, i + 2, n);
      else txt = i + 1 > n ? T.end : T.page(i + 1, n);
      count.textContent = txt;
      prev.disabled = i === 0;
      next.disabled = i >= total - 1;
    };
    pf.on("flip", update);
    pf.on("changeOrientation", update);
    update();
    prev.addEventListener("click", () => pf.flipPrev());
    next.addEventListener("click", () => pf.flipNext());
    root.tabIndex = 0;
    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); pf.flipNext(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); pf.flipPrev(); }
      else if (e.key === "Home") { e.preventDefault(); pf.flip(0); }
      else if (e.key === "End") { e.preventDefault(); pf.flip(total - 1); }
    });
  }
}
