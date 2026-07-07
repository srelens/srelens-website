/* srelens — progressive enhancement only. The page works without JS. */
(function () {
  "use strict";

  /* ---------- footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- theme toggle ---------- */
  function syncThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        document.documentElement.getAttribute("data-theme") === "light" ? "#faf9fe" : "#08060f"
      );
    }
  }
  syncThemeColor();
  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      syncThemeColor();
    });
  });

  /* ---------- latest release: rewrite version labels + download links ---------- */
  var versionEls = document.querySelectorAll("[data-version]");
  var assetLinks = document.querySelectorAll("[data-asset]");
  if ((versionEls.length || assetLinks.length) && window.fetch) {
    fetch("https://api.github.com/repos/srelens/srelens/releases/latest")
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (rel) {
        if (!rel || !rel.tag_name) return;
        var match = /(\d+\.\d+\.\d+)/.exec(rel.tag_name);
        if (!match) return;
        var version = match[1];
        versionEls.forEach(function (el) { el.textContent = "v" + version; });
        var assetUrls = {};
        (rel.assets || []).forEach(function (a) { assetUrls[a.name] = a.browser_download_url; });
        assetLinks.forEach(function (link) {
          var name = link.getAttribute("data-asset").replace("{v}", version);
          link.href = assetUrls[name] ||
            "https://github.com/srelens/srelens/releases/download/" + rel.tag_name + "/" + name;
        });
      })
      .catch(function () { /* keep the hardcoded fallback links */ });
  }

  /* ---------- copy buttons ---------- */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(function () {
        var prev = btn.textContent;
        btn.textContent = "copied";
        setTimeout(function () { btn.textContent = prev; }, 1400);
      });
    });
  });

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  if (reduced) return;

  /* ---------- hero mock: typing log line ---------- */
  var typeLine = document.getElementById("type-line");
  if (typeLine) {
    var msg = "payment gateway recovered — 200 OK (1.2s)";
    var i = 0;
    (function type() {
      if (i <= msg.length) {
        typeLine.textContent = msg.slice(0, i);
        i++;
        setTimeout(type, 34 + Math.random() * 46);
      }
    })();
  }

  /* ---------- hero mock: pending pod flips to running ---------- */
  var flip = document.getElementById("flip-status");
  if (flip) {
    setTimeout(function () {
      flip.innerHTML = '<span class="status running"><i></i>Running</span>';
      var row = flip.closest("tr");
      if (row) {
        var ready = row.children[1];
        if (ready) ready.textContent = "1/1";
      }
    }, 4200);
  }
})();
