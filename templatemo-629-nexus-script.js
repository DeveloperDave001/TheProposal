/*
  IKD 2026 Christmas Carol
*/

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var cards = Array.prototype.slice.call(document.querySelectorAll(".zcard"));
  var hudFill = document.getElementById("hudFill");
  var hudPct = document.getElementById("hudPct");
  var navUp = document.getElementById("navUp");
  var navDown = document.getElementById("navDown");

  var vh = window.innerHeight;
  var SPAN = vh * 1.5;   /* scroll distance each card owns: full-screen dwell + quick crossfade */
  var TRANS = SPAN / 3;  /* crossfade distance at each boundary */
  var ticking = false;

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  /* the z-depth escalator engine */
  function renderEngine() {
    var y = window.scrollY || window.pageYOffset || 0;
    var i, entry, recede, scale, ty, B;

    for (i = 0; i < cards.length; i++) {
      B = i * SPAN;
      /* slides in during the final TRANS of its span, so it crossfades with the card above */
      entry = i === 0 ? 1 : clamp01((y - (B - TRANS)) / TRANS);
      /* slides out during the final TRANS of its span, then the next card takes over */
      recede = cards[i].getAttribute("data-card") === "17" ? 0 : clamp01((y - (B + SPAN - TRANS)) / TRANS);
      scale = 1 - 0.1 * recede;
      ty = (1 - entry) * 100 + recede * 100;
      cards[i].style.transform = "translateY(" + ty + "%) scale(" + scale + ")";
      cards[i].style.opacity = String(1 - recede);
    }
  }

  /* hud scroll progress, works in both engine and static modes */
  function renderProgress() {
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    var p = clamp01((window.scrollY || window.pageYOffset || 0) / max);
    hudFill.style.width = (p * 100) + "%";
    hudPct.textContent = String(Math.round(p * 100)).padStart(3, "0") + "%";
    navUp.disabled = p <= 0.001;
    navDown.disabled = p >= 0.999;
  }

  function onFrame() {
    if (!reduceMotion) { renderEngine(); }
    renderProgress();
    ticking = false;
  }

  function requestRender() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onFrame);
    }
  }

  window.addEventListener("scroll", requestRender, { passive: true });

  window.addEventListener("resize", function () {
    vh = window.innerHeight;
    SPAN = vh * 1.5;
    TRANS = SPAN / 3;
    requestRender();
  });

  /* fallback render for iframe previews where scroll may never fire */
  setTimeout(requestRender, 3000);
  requestRender();

  /* up and down arrow nav: snaps to exact card boundaries */
  function gotoCard(index) {
    var i = Math.max(0, Math.min(cards.length - 1, index));
    var top;

    if (reduceMotion) {
      top = cards[i].getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
      window.scrollTo(0, top);
    } else if (i >= cards.length - 1) {
      window.scrollTo({ top: document.documentElement.scrollHeight - window.innerHeight, behavior: "smooth" });
    } else {
      window.scrollTo({ top: i * SPAN, behavior: "smooth" });
    }
  }

  navUp.addEventListener("click", function () {
    var y = window.scrollY || window.pageYOffset || 0;
    gotoCard(Math.ceil(y / SPAN - 0.001) - 1);
  });

  navDown.addEventListener("click", function () {
    var y = window.scrollY || window.pageYOffset || 0;
    gotoCard(Math.floor(y / SPAN + 0.001) + 1);
  });

  /* kinetic accordion: hover on fine pointers, tap or click everywhere */
  var accordion = document.getElementById("accordion");
  if (accordion) {
    var slices = Array.prototype.slice.call(accordion.querySelectorAll(".slice"));
    var hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function setActiveSlice(target) {
      slices.forEach(function (s) {
        var on = s === target;
        s.classList.toggle("active", on);
        s.setAttribute("aria-expanded", on ? "true" : "false");
      });
    }

    slices.forEach(function (slice) {
      if (hoverCapable) {
        slice.addEventListener("mouseenter", function () { setActiveSlice(slice); });
        slice.addEventListener("focus", function () { setActiveSlice(slice); });
      }
      slice.addEventListener("click", function () {
        if (slice.classList.contains("active") && !hoverCapable) {
          setActiveSlice(null);
        } else {
          setActiveSlice(slice);
        }
      });
    });

    if (hoverCapable) {
      accordion.addEventListener("mouseleave", function () { setActiveSlice(null); });
    }
  }

  /* autotype typewriter effect */
  var autos = document.querySelectorAll(".autotype");
  autos.forEach(function (el) {
    var words = JSON.parse(el.getAttribute("data-words") || "[]");
    if (!words.length) return;
    var wi = 0, ci = 0, dir = 1, timer;
    function tick() {
      var w = words[wi];
      if (dir === 1) {
        ci++;
        el.textContent = w.slice(0, ci);
        if (ci >= w.length) { dir = -1; clearTimeout(timer); timer = setTimeout(tick, 1500); return; }
      } else {
        ci--;
        el.textContent = w.slice(0, ci);
        if (ci <= 0) { dir = 1; wi = (wi + 1) % words.length; }
      }
      timer = setTimeout(tick, dir === 1 ? 80 : 40);
    }
    tick();
  });

  /* matrix tabs with data-goto switching */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".matrix-tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".matrix-img"));
  var caption = document.getElementById("matrixCaption");

  var captions = {
    core: "FIG. 01 / CORE FRAME",
    fluidics: "FIG. 02 / FLUIDICS MANIFOLD",
    sync: "FIG. 03 / SYNC TIMING PLANE"
  };

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var key = tab.getAttribute("data-goto");

      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });

      panels.forEach(function (p) {
        p.classList.toggle("active", p.getAttribute("data-panel") === key);
      });

      caption.textContent = captions[key];
    });
  });
})();
