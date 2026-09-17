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

  /* ---------- screenshot zoom lightbox ---------- */
  var zoomOverlay = null;
  var zoomImg = null;
  var zoomCaption = null;

  function initZoomOverlay() {
    if (zoomOverlay) return;
    zoomOverlay = document.createElement("div");
    zoomOverlay.className = "shot-zoom-overlay";
    zoomOverlay.setAttribute("role", "dialog");
    zoomOverlay.setAttribute("aria-modal", "true");
    zoomOverlay.setAttribute("aria-label", "Enlarged screenshot");

    var closeBtn = document.createElement("button");
    closeBtn.className = "shot-zoom-close";
    closeBtn.setAttribute("type", "button");
    closeBtn.setAttribute("aria-label", "Close enlarged view (Esc)");
    closeBtn.innerHTML = '<span>Esc</span> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';

    var content = document.createElement("div");
    content.className = "shot-zoom-content";

    zoomImg = document.createElement("img");
    zoomImg.className = "shot-zoom-img";
    zoomImg.alt = "";

    zoomCaption = document.createElement("div");
    zoomCaption.className = "shot-zoom-caption";

    content.appendChild(zoomImg);
    content.appendChild(zoomCaption);
    zoomOverlay.appendChild(closeBtn);
    zoomOverlay.appendChild(content);
    document.body.appendChild(zoomOverlay);

    function closeZoom() {
      if (!zoomOverlay || !zoomOverlay.classList.contains("active")) return;
      zoomOverlay.classList.remove("active");
      document.body.classList.remove("shot-zoom-open");
      setTimeout(function () {
        if (!zoomOverlay.classList.contains("active")) {
          zoomImg.src = "";
        }
      }, 250);
    }

    zoomOverlay.addEventListener("click", function () {
      closeZoom();
    });

    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      closeZoom();
    });

    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && zoomOverlay && zoomOverlay.classList.contains("active")) {
        closeZoom();
      }
    });
  }

  function openZoom(img, captionHtml) {
    initZoomOverlay();
    zoomImg.src = img.currentSrc || img.src;
    zoomImg.alt = img.alt || "Enlarged screenshot";
    if (captionHtml) {
      zoomCaption.innerHTML = captionHtml;
      zoomCaption.style.display = "inline-flex";
    } else {
      zoomCaption.style.display = "none";
    }
    document.body.classList.add("shot-zoom-open");
    void zoomOverlay.offsetWidth;
    zoomOverlay.classList.add("active");
  }

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (target.closest("a, button, input, select, textarea, .shot-zoom-overlay")) return;

    var figure = target.closest(".shot, .hero-shot, figure");
    if (!figure) return;

    var img = target.tagName === "IMG" ? target : figure.querySelector("img");
    if (!img) return;

    var visibleImg = img;
    if (figure.querySelectorAll("img").length > 1) {
      var isDark = document.documentElement.getAttribute("data-theme") !== "light";
      var darkImg = figure.querySelector(".shot-dark");
      var lightImg = figure.querySelector(".shot-light");
      if (isDark && darkImg) visibleImg = darkImg;
      else if (!isDark && lightImg) visibleImg = lightImg;
    }

    var cap = figure.querySelector("figcaption, .shot-cap") ||
      (figure.nextElementSibling && figure.nextElementSibling.classList.contains("shot-cap") ? figure.nextElementSibling : null);
    var capHtml = cap ? cap.innerHTML : "";

    e.preventDefault();
    openZoom(visibleImg, capHtml);
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
