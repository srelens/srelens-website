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

  /* ---------- navigation scroll progress ---------- */
  function updateScrollProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pageProgress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    var progress = 0.18 + pageProgress * 0.82;
    document.body.style.setProperty("--scroll-progress", progress.toFixed(4));
  }
  updateScrollProgress();
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", updateScrollProgress);

  /* ---------- table of contents active section scrollspy ---------- */
  var contentNav = document.querySelector(".content-nav");
  if (contentNav) {
    var tocLinks = Array.from(contentNav.querySelectorAll("a[href^='#']"));
    var headingTargets = tocLinks
      .map(function (link) {
        var id = link.getAttribute("href").slice(1);
        var el = document.getElementById(id);
        return el ? { id: id, el: el, link: link } : null;
      })
      .filter(Boolean);

    if (headingTargets.length) {
      function updateActiveToc() {
        var scrollY = window.scrollY;
        var offset = 140;
        var current = headingTargets[0];

        for (var i = 0; i < headingTargets.length; i++) {
          var target = headingTargets[i];
          var top = target.el.getBoundingClientRect().top + scrollY - offset;
          if (scrollY >= top) {
            current = target;
          } else {
            break;
          }
        }

        headingTargets.forEach(function (target) {
          if (target === current) {
            target.link.classList.add("active");
          } else {
            target.link.classList.remove("active");
          }
        });
      }

      updateActiveToc();
      window.addEventListener("scroll", updateActiveToc, { passive: true });
      window.addEventListener("resize", updateActiveToc);
    }
  }

  /* ---------- anchor hash navigation fallback ---------- */
  function resolveHashAnchor() {
    if (!window.location.hash) return;
    var hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    var el = document.getElementById(hash);
    if (!el) {
      var lower = hash.toLowerCase();
      el = document.getElementById(lower) ||
           document.getElementById(lower.replace(/\s+/g, "-")) ||
           document.querySelector('[id="' + lower + '" i]');
    }
    if (el) {
      setTimeout(function () {
        el.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", resolveHashAnchor);
  } else {
    resolveHashAnchor();
  }
  window.addEventListener("hashchange", resolveHashAnchor);

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

  /* ---------- product walkthrough dialog ---------- */
  var tourDialog = document.querySelector("[data-tour-dialog]");
  var tourVideo = document.querySelector("[data-tour-video]");
  document.querySelectorAll("[data-tour-open]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!tourDialog || typeof tourDialog.showModal !== "function") {
        window.location.href = "/assets/media/srelens-product-tour.mp4";
        return;
      }
      tourDialog.showModal();
      if (tourVideo) {
        tourVideo.currentTime = 0;
        tourVideo.play().catch(function () { /* controls remain available */ });
      }
    });
  });
  function closeTour() {
    if (!tourDialog) return;
    if (tourVideo) tourVideo.pause();
    tourDialog.close();
  }
  document.querySelectorAll("[data-tour-close]").forEach(function (btn) {
    btn.addEventListener("click", closeTour);
  });
  if (tourDialog) {
    tourDialog.addEventListener("click", function (event) {
      if (event.target === tourDialog) closeTour();
    });
    tourDialog.addEventListener("close", function () {
      if (tourVideo) tourVideo.pause();
    });
  }

  /* ---------- interactive incident drill ---------- */
  var incidentTabs = Array.from(document.querySelectorAll("[data-incident-tab]"));
  var incidentPanels = Array.from(document.querySelectorAll("[data-incident-panel]"));
  function showIncidentStep(step, focusTab) {
    incidentTabs.forEach(function (tab) {
      var selected = tab.getAttribute("data-incident-tab") === step;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) tab.focus();
    });
    incidentPanels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-incident-panel") !== step;
    });
  }
  incidentTabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      showIncidentStep(tab.getAttribute("data-incident-tab"), false);
    });
    tab.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      var delta = event.key === "ArrowRight" ? 1 : -1;
      var next = (index + delta + incidentTabs.length) % incidentTabs.length;
      showIncidentStep(incidentTabs[next].getAttribute("data-incident-tab"), true);
    });
  });
  document.querySelectorAll("[data-incident-next]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      showIncidentStep(btn.getAttribute("data-incident-next"), false);
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

  /* ---------- screenshot zoom modal dialog ---------- */
  var zoomDialog = document.createElement("dialog");
  zoomDialog.className = "shot-dialog";
  zoomDialog.setAttribute("aria-label", "Enlarged screenshot");

  var zoomCloseBtn = document.createElement("button");
  zoomCloseBtn.className = "shot-dialog-close";
  zoomCloseBtn.setAttribute("type", "button");
  zoomCloseBtn.setAttribute("aria-label", "Close enlarged view (Esc)");
  zoomCloseBtn.innerHTML = '<span>Esc</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

  var zoomBody = document.createElement("div");
  zoomBody.className = "shot-dialog-body";

  var zoomImg = document.createElement("img");
  zoomImg.className = "shot-dialog-img";
  zoomImg.alt = "Enlarged screenshot";

  zoomBody.appendChild(zoomImg);
  zoomDialog.appendChild(zoomCloseBtn);
  zoomDialog.appendChild(zoomBody);

  function ensureDialogInBody() {
    if (!document.body.contains(zoomDialog)) {
      document.body.appendChild(zoomDialog);
    }
  }

  function openZoom(src, alt) {
    ensureDialogInBody();
    zoomImg.src = src;
    zoomImg.alt = alt || "Enlarged screenshot";
    if (typeof zoomDialog.showModal === "function") {
      try {
        zoomDialog.showModal();
      } catch (err) {
        /* if already open, ignore */
      }
    } else {
      zoomDialog.setAttribute("open", "");
    }
  }

  function closeZoom() {
    if (typeof zoomDialog.close === "function") {
      try {
        zoomDialog.close();
      } catch (err) {}
    } else {
      zoomDialog.removeAttribute("open");
    }
  }

  zoomDialog.addEventListener("click", function (e) {
    closeZoom();
  });

  zoomCloseBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    closeZoom();
  });

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (target.closest("a, button, input, select, textarea, dialog")) return;

    var fig = target.closest(".shot, .hero-shot, figure");
    if (!fig) return;

    var img = target.tagName === "IMG" ? target : fig.querySelector("img");
    if (!img) return;

    var visibleImg = img;
    if (fig.querySelectorAll("img").length > 1) {
      var isDark = document.documentElement.getAttribute("data-theme") !== "light";
      var darkImg = fig.querySelector(".shot-dark");
      var lightImg = fig.querySelector(".shot-light");
      if (isDark && darkImg) visibleImg = darkImg;
      else if (!isDark && lightImg) visibleImg = lightImg;
    }

    var src = visibleImg.currentSrc || visibleImg.src || visibleImg.getAttribute("src");
    if (!src) return;

    e.preventDefault();
    openZoom(src, visibleImg.alt);
  });

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
