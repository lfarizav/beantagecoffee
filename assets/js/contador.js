// Public counters: site visitors and sample readers. Backend: small Worker + D1 (see beantage-work/contador).
// No cookies, no personal data. If the Worker is down the counter stays hidden and nothing is logged.
(function () {
  var API = "https://beantage-contador.beantagecoffeeroaster.workers.dev";
  if (window.__BEANTAGE_API) API = window.__BEANTAGE_API;
  var en = document.documentElement.lang === "en";
  var fine = document.querySelector(".site-footer__fine");
  if (!fine) return;

  function store(op, k, v) {
    try { return op === "get" ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function call(method, path) {
    return fetch(API + path, { method: method, mode: "cors", credentials: "omit", keepalive: true })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); });
  }
  function hit(k) { return call("POST", "/v1/hit?k=" + k); }

  var el = document.createElement("p");
  el.className = "site-footer__count";
  el.hidden = true;
  el.setAttribute("aria-live", "off");
  fine.parentNode.insertBefore(el, fine);

  function show(c) {
    if (!c || typeof c.visitas !== "number" || typeof c.lectores !== "number") return;
    var f = new Intl.NumberFormat(en ? "en" : "es-CO");
    var v = c.visitas, l = c.lectores;
    el.textContent = en
      ? f.format(v) + (v === 1 ? " visitor · " : " visitors · ") + f.format(l) + (l === 1 ? " sample reader" : " sample readers")
      : f.format(v) + (v === 1 ? " visitante · " : " visitantes · ") + f.format(l) + (l === 1 ? " lector de la muestra" : " lectores de la muestra");
    el.hidden = false;
  }

  var latest = null;
  function upd(c) { latest = c; show(c); }

  // Visitor: once per browser per day. If storage fails, once per page load.
  var today = new Date().toISOString().slice(0, 10);
  var p;
  if (store("get", "bt_v") === today) p = call("GET", "/v1/counts");
  else { store("set", "bt_v", today); p = hit("visitas"); }
  p.then(upd).catch(function () {});

  // Reader: once per browser, when the sample reader is seen open or the PDF is clicked.
  var counted = store("get", "bt_r") === "1";
  function reader() {
    if (counted) return;
    counted = true;
    store("set", "bt_r", "1");
    hit("lectores").then(upd).catch(function () {});
  }
  var bk = document.querySelector(".bk");
  if (bk && !counted && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); reader(); }
    }, { threshold: 0.4 });
    io.observe(bk);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (a && /-sample\.pdf/.test(a.getAttribute("href"))) reader();
  });
})();
