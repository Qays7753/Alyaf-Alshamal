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

  function unitLabel(item, packIndex) {
    return item.unit === "piece" ? "حبة" : "كيس " + window.packLabel(item.packs[packIndex]);
  }

  function buildRow(item) {
    picks[item.id] = { qty: 0, packIndex: 0 };

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

    var sizeSel = null;
    if (item.packs && item.packs.length > 1) {
      sizeSel = document.createElement("select");
      sizeSel.className = "size-select";
      sizeSel.setAttribute("aria-label", "حجم كيس " + item.name);
      item.packs.forEach(function (g, idx) {
        var o = document.createElement("option");
        o.value = String(idx);
        o.textContent = "كيس " + window.packLabel(g);
        sizeSel.appendChild(o);
      });
      sizeSel.addEventListener("change", function () {
        picks[item.id].packIndex = Number(sizeSel.value);
        persist();
      });
      main.appendChild(sizeSel);
    } else {
      var fixed = document.createElement("div");
      fixed.className = "pick-size";
      fixed.textContent = unitLabel(item, 0);
      main.appendChild(fixed);
    }

    row.appendChild(main);

    var stepper = document.createElement("div");
    stepper.className = "stepper";

    var minus = document.createElement("button");
    minus.type = "button";
    minus.className = "step-btn";
    minus.textContent = "−";
    minus.setAttribute("aria-label", "إنقاص كمية " + item.name);

    var out = document.createElement("output");
    out.textContent = "0";

    var plus = document.createElement("button");
    plus.type = "button";
    plus.className = "step-btn";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "زيادة كمية " + item.name);

    minus.addEventListener("click", function () { bump(-1); });
    plus.addEventListener("click", function () { bump(1); });

    stepper.appendChild(minus);
    stepper.appendChild(out);
    stepper.appendChild(plus);
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
      F.announce(item.name + ": " + s.qty);
      persist();
    }

    function sync() {
      var s = picks[item.id];
      out.textContent = String(s.qty);
      minus.disabled = s.qty === 0;
      row.classList.toggle("is-on", s.qty > 0);
      if (sizeSel) sizeSel.value = String(s.packIndex);
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
        picks[id].packIndex = saved.picks[id].packIndex || 0;
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
      picks[id].packIndex = 0;
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
      lines.push({ name: item.name, qty: s.qty, unit: unitLabel(item, s.packIndex) });
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

    out.push("• الأصناف والكميات");
    chosen().forEach(function (l) {
      out.push("- " + l.name + ": " + l.qty + " × " + l.unit);
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
