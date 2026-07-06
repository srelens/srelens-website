/* Srelens site — progressive enhancement only. Page is fully usable without JS. */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Scroll reveals */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* Hero mock: type out a log line */
  var typeLine = document.getElementById("type-line");
  if (typeLine) {
    var msg = "payment gateway recovered — 200 OK";
    if (reducedMotion) {
      typeLine.textContent = msg;
    } else {
      var i = 0;
      var typeTick = function () {
        if (i <= msg.length) {
          typeLine.textContent = msg.slice(0, i);
          i += 1;
          setTimeout(typeTick, 34 + Math.random() * 40);
        }
      };
      setTimeout(typeTick, 1400);
    }
  }

  /* Hero mock: Pending pod becomes Running */
  var flip = document.getElementById("flip-status");
  if (flip && !reducedMotion) {
    setTimeout(function () {
      flip.innerHTML = '<span class="status running"><i></i>Running</span>';
      var row = flip.closest("tr");
      if (row) {
        var ready = row.children[1];
        var age = row.children[4];
        if (ready) { ready.textContent = "1/1"; }
        if (age) { age.textContent = "31s"; }
      }
    }, 3800);
  }

  /* Announcement bar dismiss */
  var announce = document.getElementById("announce");
  if (announce) {
    if (sessionStorage.getItem("announce-dismissed")) {
      announce.classList.add("hidden");
    }
    var closeBtn = announce.querySelector(".announce-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        announce.classList.add("hidden");
        sessionStorage.setItem("announce-dismissed", "1");
      });
    }
  }

  /* Copy buttons (code block + hero command chip) */
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy") || "";
      navigator.clipboard.writeText(text).then(function () {
        var prev = btn.textContent;
        btn.textContent = "copied";
        setTimeout(function () { btn.textContent = prev; }, 1600);
      });
    });
  });

  /* Theme toggle */
  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var root = document.documentElement;
      var current = root.getAttribute("data-theme");
      if (!current) {
        current = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      }
      var next = current === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  });

  /* Footer year */
  var year = document.getElementById("year");
  if (year) { year.textContent = String(new Date().getFullYear()); }
})();

