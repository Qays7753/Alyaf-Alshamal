/* ============================================================
   معرض صور المنتجات — كبسة جنب كل صنف تفتح الصور مع تنقّل
   يعمل على صفحة الأسعار وصفحة طلب عرض السعر
   ============================================================ */

(function () {
  "use strict";

  var overlay, imgEl, emptyEl, captionEl, counterEl, prevBtn, nextBtn, frameEl;
  var current = { images: [], index: 0, name: "" };
  var lastFocused = null;

  var PHOTO_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="5" width="18" height="14" rx="2.5"/>' +
    '<circle cx="8.5" cy="10" r="1.6"/>' +
    '<path d="M21 16.5 16.2 12a1.6 1.6 0 0 0-2.3 0L4.5 21"/></svg>';

  /** ينشئ كبسة الصورة الخاصة بصنف — أو null إذا لا صور ومطلوب إخفاؤها */
  function createButton(item) {
    var images = item.images || [];
    if (!images.length && window.HIDE_EMPTY_IMAGE_BUTTONS) return null;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "photo-btn" + (images.length ? "" : " is-empty");
    btn.setAttribute("aria-label", "صور " + item.name);

    if (images.length) {
      var thumb = document.createElement("img");
      thumb.src = window.IMAGE_DIR + images[0];
      thumb.alt = "";
      thumb.loading = "lazy";
      thumb.decoding = "async";
      thumb.width = 44;
      thumb.height = 44;
      btn.appendChild(thumb);
      if (images.length > 1) {
        var badge = document.createElement("span");
        badge.className = "photo-badge";
        badge.textContent = images.length;
        btn.appendChild(badge);
      }
    } else {
      btn.innerHTML = PHOTO_ICON;
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      open(item);
    });

    return btn;
  }

  function buildOverlay() {
    overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="lb-panel">' +
        '<div class="lb-head">' +
          '<span class="lb-name"></span>' +
          '<button type="button" class="lb-close" aria-label="إغلاق">✕</button>' +
        '</div>' +
        '<div class="lb-frame">' +
          '<img class="lb-img" alt="">' +
          '<p class="lb-empty">صور هذا الصنف ستُضاف قريباً</p>' +
          '<button type="button" class="lb-nav lb-prev" aria-label="الصورة السابقة">›</button>' +
          '<button type="button" class="lb-nav lb-next" aria-label="الصورة التالية">‹</button>' +
        '</div>' +
        '<div class="lb-counter"></div>' +
      '</div>';

    document.body.appendChild(overlay);

    imgEl = overlay.querySelector(".lb-img");
    emptyEl = overlay.querySelector(".lb-empty");
    captionEl = overlay.querySelector(".lb-name");
    counterEl = overlay.querySelector(".lb-counter");
    prevBtn = overlay.querySelector(".lb-prev");
    nextBtn = overlay.querySelector(".lb-next");
    frameEl = overlay.querySelector(".lb-frame");

    overlay.querySelector(".lb-close").addEventListener("click", close);
    prevBtn.addEventListener("click", function () { step(-1); });
    nextBtn.addEventListener("click", function () { step(1); });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    document.addEventListener("keydown", function (e) {
      if (overlay.hidden) return;
      if (e.key === "Escape") close();
      // في الواجهة العربية السهم الأيسر يتقدّم للأمام
      else if (e.key === "ArrowLeft") step(1);
      else if (e.key === "ArrowRight") step(-1);
    });

    // السحب بالإصبع للتنقّل
    var startX = null;
    frameEl.addEventListener("touchstart", function (e) {
      startX = e.changedTouches[0].clientX;
    }, { passive: true });
    frameEl.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
      startX = null;
    }, { passive: true });
  }

  function open(item) {
    if (!overlay) buildOverlay();
    lastFocused = document.activeElement;
    current.images = item.images || [];
    current.name = item.name;
    current.index = 0;
    captionEl.textContent = item.name;
    render();
    overlay.hidden = false;
    document.body.classList.add("no-scroll");
    overlay.querySelector(".lb-close").focus();
  }

  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    imgEl.removeAttribute("src");
    document.body.classList.remove("no-scroll");
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function step(dir) {
    var n = current.images.length;
    if (n < 2) return;
    current.index = (current.index + dir + n) % n;
    render();
  }

  function render() {
    var n = current.images.length;
    var multi = n > 1;

    if (n) {
      imgEl.src = window.IMAGE_DIR + current.images[current.index];
      imgEl.alt = current.name;
      imgEl.hidden = false;
      emptyEl.hidden = true;
    } else {
      imgEl.hidden = true;
      emptyEl.hidden = false;
    }

    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;
    counterEl.hidden = !multi;
    counterEl.textContent = multi ? current.index + 1 + " / " + n : "";
  }

  window.Gallery = { createButton: createButton, open: open, close: close };
})();
