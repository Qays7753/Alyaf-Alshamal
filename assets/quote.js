/* ============================================================
   صفحة "اعرف سعرك الخاص"
   • بدون أسعار — السعر النهائي يعتمد على تفاصيل الطلب
   • الكتابة محصورة ببيانات التواصل والملاحظات، والباقي كبسات
   • الحالة محفوظة في localStorage حتى لا يضيع الطلب
   ============================================================ */

(function () {
  "use strict";

  var F = window.Form;
  var MAX_QTY = 999;
  var store = F.storage("alyaf.quote.v2");

  var picks   = {};   // itemId -> { qty, packIndex }
  var answers = {};   // questionId -> value
  var contact = {};   // company / person / phone / location

  var itemsRoot     = document.getElementById("items");
  var questionsRoot = document.getElementById("questions");
  var contactRoot   = document.getElementById("contact");
  var notesEl       = document.getElementById("notes");
  var countEl       = document.getElementById("sb-count");
  var hintEl        = document.getElementById("sb-hint");
  var sendBtn       = document.getElementById("send");

  var rows = {};      // itemId -> دوال تحديث الصف

  /* ---------- قائمة الأصناف ---------- */

  window.CATALOGUE.forEach(function (group) {
    var wrap = document.createElement("div");
    wrap.className = "group";

    var heading = document.createElement("h3");
    heading.className = "group-heading";
    heading.textContent = group.group;
    wrap.appendChild(heading);

    group.items.forEach(function (item) {
      wrap.appendChild(buildRow(item));
    });

    itemsRoot.appendChild(wrap);
  });

  function buildRow(item) {
    picks[item.id] = { qty: 0 };
    var unit = window.unitOf(item);

    var row = document.createElement("div");
    row.className = "pick";

    var btn = window.Gallery.createButton(item);
    if (btn) row.appendChild(btn);
    else row.classList.add("no-photo");

    var main = document.createElement("div");
    main.className = "pick-main";

    var name = document.createElement("div");
    name.className = "pick-name";
    name.textContent = item.name;
    main.appendChild(name);

    row.appendChild(main);

    var stepper = document.createElement("div");
    stepper.className = "stepper";

    var minus = document.createElement("button");
    minus.type = "button";
    minus.className = "step-btn";
    minus.textContent = "−";
    minus.setAttribute("aria-label", "إنقاص كمية " + item.name);

    // خانة رقمية: الكميات الكبيرة تُكتب مرة واحدة بدل عشرات الكبسات
    var field = document.createElement("input");
    field.type = "number";
    field.className = "step-input";
    field.min = "0";
    field.max = String(MAX_QTY);
    field.step = "1";
    field.value = "0";
    field.setAttribute("inputmode", "numeric");
    field.setAttribute("aria-label", "كمية " + item.name + " بالـ" + unit);

    var plus = document.createElement("button");
    plus.type = "button";
    plus.className = "step-btn";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "زيادة كمية " + item.name);

    minus.addEventListener("click", function () { bump(-1); });
    plus.addEventListener("click", function () { bump(1); });

    field.addEventListener("focus", function () { field.select(); });
    field.addEventListener("input", function () {
      var v = parseInt(field.value, 10);
      picks[item.id].qty = isNaN(v) ? 0 : Math.max(0, Math.min(MAX_QTY, v));
      sync(true);
      persist();
    });
    field.addEventListener("blur", function () { sync(); });

    stepper.appendChild(minus);
    stepper.appendChild(field);
    stepper.appendChild(plus);

    var unitTag = document.createElement("span");
    unitTag.className = "step-unit";
    unitTag.textContent = unit;
    stepper.appendChild(unitTag);

    row.appendChild(stepper);

    function bump(d) {
      var s = picks[item.id];
      var next = Math.max(0, Math.min(MAX_QTY, s.qty + d));
      if (next === s.qty && d > 0) {
        F.announce("وصلت الحد الأقصى " + MAX_QTY + " لصنف " + item.name);
        return;
      }
      s.qty = next;
      sync();
      F.announce(item.name + ": " + s.qty + " " + unit);
      persist();
    }

    function sync(keepTyping) {
      var s = picks[item.id];
      if (!keepTyping) field.value = String(s.qty);
      minus.disabled = s.qty === 0;
      row.classList.toggle("is-on", s.qty > 0);
      refreshBar();
    }

    rows[item.id] = sync;
    sync();
    return row;
  }

  /* ---------- بيانات التواصل والتفاصيل ---------- */

  F.buildContact(contactRoot, contact, persist);
  F.buildQuestions(questionsRoot, answers, persist);

  /* ---------- الحفظ والاستعادة ---------- */

  function persist() {
    store.save({ picks: picks, answers: answers, contact: contact, notes: notesEl.value || "" });
    refreshBar();
  }

  function restore(saved) {
    if (!saved) return false;
    if (saved.notes) notesEl.value = saved.notes;
    if (saved.contact) {
      Object.keys(saved.contact).forEach(function (k) { contact[k] = saved.contact[k]; });
      F.syncContact(contactRoot, contact);
    }
    if (saved.answers) {
      Object.keys(saved.answers).forEach(function (k) { answers[k] = saved.answers[k]; });
      F.syncQuestions(questionsRoot, answers);
    }
    var any = false;
    if (saved.picks) {
      Object.keys(saved.picks).forEach(function (id) {
        if (!picks[id] || !saved.picks[id]) return;   // صنف حُذف من القائمة
        picks[id].qty = saved.picks[id].qty || 0;
        if (picks[id].qty > 0) any = true;
        rows[id]();
      });
    }
    return any;
  }

  function restart() {
    store.clear();
    Object.keys(picks).forEach(function (id) {
      picks[id].qty = 0;
      rows[id]();
    });
    Object.keys(answers).forEach(function (k) { delete answers[k]; });
    Object.keys(contact).forEach(function (k) { delete contact[k]; });
    notesEl.value = "";
    F.syncContact(contactRoot, contact);
    F.syncQuestions(questionsRoot, answers);
    refreshBar();
  }

  /* ---------- الشريط السفلي ---------- */

  function chosen() {
    var lines = [];
    window.allItems().forEach(function (item) {
      var s = picks[item.id];
      if (!s || s.qty === 0) return;
      lines.push({ name: item.name, qty: s.qty, unit: window.unitOf(item) });
    });
    return lines;
  }

  function refreshBar() {
    var n = chosen().length;
    var needsContact = !!F.missingRequired(contact);

    countEl.textContent = n
      ? n + (n === 1 ? " صنف مختار" : " أصناف مختارة")
      : "لم تختر أي صنف بعد";

    if (!n) hintEl.textContent = "اختر صنف واحد على الأقل";
    else if (needsContact) hintEl.textContent = "ناقص اسم المنشأة";
    else hintEl.textContent = "جاهز للإرسال";

    sendBtn.disabled = n === 0 || sendBtn.dataset.cooling === "1";
  }

  /* ---------- الرسالة ---------- */

  function buildMessage(notesOverride) {
    var out = ["طلب عرض سعر — ألياف الشمال", ""];

    var c = F.contactLines(contact);
    if (c.length) out.push("• بيانات التواصل"), out = out.concat(c, "");

    var a = F.answerLines(answers);
    if (a.length) out.push("• المنشأة والتوصيل"), out = out.concat(a, "");

    out.push("• الأصناف والكميات المطلوبة في كل توصيلة");
    chosen().forEach(function (l) {
      out.push("- " + l.name + ": " + l.qty + " " + l.unit);
    });

    var notes = notesOverride !== undefined ? notesOverride : (notesEl.value || "").trim();
    if (notes) out.push("", "• ملاحظات", notes);

    out.push("", "أرجو تزويدي بعرض سعر مخصّص.");
    return out.join("\n");
  }

  /* ---------- الإرسال ---------- */

  sendBtn.addEventListener("click", function () {
    if (sendBtn.disabled || sendBtn.dataset.cooling === "1") return;
    if (F.flagMissing(contactRoot, contact)) return;
    F.send(sendBtn, buildMessage, notesEl, refreshBar);
  });

  var notesTimer = null;
  notesEl.addEventListener("input", function () {
    if (notesTimer) clearTimeout(notesTimer);
    notesTimer = setTimeout(persist, 400);
  });

  /* ---------- الإقلاع ---------- */

  if (restore(store.load())) {
    F.resumeBar(document.getElementById("items").parentNode, restart);
  }
  refreshBar();
})();
