/* ============================================================
   صفحة "اطلب عيّنة مجانية"
   • الخطوة 1: يأشّر كل الأصناف اللي بيستهلكها — بلا حد
   • الخطوة 2: يختار عيّناته من بينها — خمسة كحد أقصى
   • نفس بيانات التواصل وتفاصيل التوصيل، وبلا أي سعر
   ============================================================ */

(function () {
  "use strict";

  var F = window.Form;
  var MAX_SAMPLES = 5;
  var store = F.storage("alyaf.sample.v1");

  var uses    = {};   // itemId -> true إذا كان يستهلكه
  var samples = {};   // itemId -> true إذا طلبه كعيّنة
  var answers = {};
  var contact = {};

  var usesRoot      = document.getElementById("uses");
  var samplesRoot   = document.getElementById("samples");
  var emptyNote     = document.getElementById("samples-empty");
  var counterEl     = document.getElementById("samples-counter");
  var questionsRoot = document.getElementById("questions");
  var contactRoot   = document.getElementById("contact");
  var notesEl       = document.getElementById("notes");
  var countEl       = document.getElementById("sb-count");
  var hintEl        = document.getElementById("sb-hint");
  var sendBtn       = document.getElementById("send");

  var useRows = {};   // itemId -> دالة مزامنة صف الاستهلاك

  /* ---------- الخطوة 1: شو بتستهلك ---------- */

  window.CATALOGUE.forEach(function (group) {
    var wrap = document.createElement("div");
    wrap.className = "group";

    var heading = document.createElement("h3");
    heading.className = "group-heading";
    heading.textContent = group.group;
    wrap.appendChild(heading);

    group.items.forEach(function (item) {
      wrap.appendChild(buildUseRow(item));
    });

    usesRoot.appendChild(wrap);
  });

  /** صف اختيار: مربّع اختيار حقيقي داخل label، وزر الصورة شقيق له لا ابن */
  function buildChoiceRow(item, opts) {
    var row = document.createElement("div");
    row.className = "pick pick-tap";

    if (opts.withPhoto) {
      var btn = window.Gallery.createButton(item);
      if (btn) row.appendChild(btn);
      else row.classList.add("no-photo");
    } else {
      row.classList.add("no-photo");
    }

    var label = document.createElement("label");
    label.className = "pick-choice";

    var box = document.createElement("input");
    box.type = "checkbox";
    box.className = "pick-box";

    var main = document.createElement("span");
    main.className = "pick-main";
    var name = document.createElement("span");
    name.className = "pick-name";
    name.textContent = item.name;
    main.appendChild(name);

    var mark = document.createElement("span");
    mark.className = "pick-mark";
    mark.innerHTML = checkIcon();

    label.appendChild(box);
    label.appendChild(main);
    label.appendChild(mark);
    row.appendChild(label);

    box.addEventListener("change", function () { opts.onToggle(box.checked); });

    return { row: row, box: box, setOn: function (on) {
      box.checked = on;
      row.classList.toggle("is-on", on);
    }, setLocked: function (locked) {
      box.disabled = locked;
      row.classList.toggle("is-locked", locked);
    } };
  }

  function buildUseRow(item) {
    var r = buildChoiceRow(item, {
      withPhoto: true,
      onToggle: function (on) {
        if (on) {
          uses[item.id] = true;
        } else {
          delete uses[item.id];
          delete samples[item.id];   // ما بنطلب عيّنة من صنف مش مستهلكه
        }
        r.setOn(on);
        renderSamples();
        F.announce(item.name + (on ? " — مضاف لقائمة استهلاكك" : " — مشيل"));
        persist();
      }
    });

    useRows[item.id] = function () { r.setOn(!!uses[item.id]); };
    useRows[item.id]();
    return r.row;
  }

  /* ---------- الخطوة 2: اختيار العيّنات ---------- */

  function sampleCount() {
    return Object.keys(samples).length;
  }

  function renderSamples() {
    samplesRoot.innerHTML = "";
    var chosen = window.allItems().filter(function (i) { return uses[i.id]; });

    emptyNote.hidden = chosen.length > 0;
    counterEl.hidden = chosen.length === 0;

    chosen.forEach(function (item) {
      samplesRoot.appendChild(buildSampleRow(item));
    });

    updateCounter();
  }

  function buildSampleRow(item) {
    var on = !!samples[item.id];
    var full = sampleCount() >= MAX_SAMPLES && !on;

    var r = buildChoiceRow(item, {
      withPhoto: false,
      onToggle: function (checked) {
        if (checked) samples[item.id] = true;
        else delete samples[item.id];
        F.announce(item.name + (checked ? " — مضاف للعيّنات" : " — مشيل من العيّنات"));
        renderSamples();
        persist();
      }
    });

    r.setOn(on);
    r.setLocked(full);
    if (full) r.row.title = "وصلت الحد الأقصى — شيل عيّنة عشان تبدّل";
    return r.row;
  }

  function updateCounter() {
    var n = sampleCount();
    counterEl.textContent = n + " من " + MAX_SAMPLES;
    counterEl.classList.toggle("is-full", n >= MAX_SAMPLES);
    refreshBar();
  }

  function flashCounter() {
    counterEl.classList.remove("flash");
    void counterEl.offsetWidth;
    counterEl.classList.add("flash");
  }

  function checkIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="m5 12.5 4.5 4.5L19 7"/></svg>';
  }

  /* ---------- بيانات التواصل والتفاصيل ---------- */

  F.buildContact(contactRoot, contact, persist);
  F.buildQuestions(questionsRoot, answers, persist);

  /* ---------- الحفظ والاستعادة ---------- */

  function persist() {
    store.save({
      uses: Object.keys(uses),
      samples: Object.keys(samples),
      answers: answers,
      contact: contact,
      notes: notesEl.value || ""
    });
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
    (saved.uses || []).forEach(function (id) {
      if (useRows[id]) { uses[id] = true; useRows[id](); }
    });
    (saved.samples || []).slice(0, MAX_SAMPLES).forEach(function (id) {
      if (uses[id]) samples[id] = true;
    });
    renderSamples();
    return (saved.uses || []).length > 0;
  }

  function restart() {
    store.clear();
    Object.keys(uses).forEach(function (id) { delete uses[id]; useRows[id](); });
    Object.keys(samples).forEach(function (id) { delete samples[id]; });
    Object.keys(answers).forEach(function (k) { delete answers[k]; });
    Object.keys(contact).forEach(function (k) { delete contact[k]; });
    notesEl.value = "";
    F.syncContact(contactRoot, contact);
    F.syncQuestions(questionsRoot, answers);
    renderSamples();
  }

  /* ---------- الشريط السفلي ---------- */

  function refreshBar() {
    var n = sampleCount();
    var used = Object.keys(uses).length;
    var needsContact = !!F.missingRequired(contact);

    countEl.textContent = n
      ? n + (n === 1 ? " عيّنة مختارة" : " عيّنات مختارة")
      : "لم تختر أي عيّنة بعد";

    if (!used) hintEl.textContent = "أشّر أصنافك أول";
    else if (!n) hintEl.textContent = "اختر عيّنة وحدة على الأقل";
    else if (needsContact) hintEl.textContent = "ناقص اسم المنشأة";
    else hintEl.textContent = used + " صنف بتستهلكه · جاهز للإرسال";

    sendBtn.disabled = n === 0 || sendBtn.dataset.cooling === "1";
  }

  /* ---------- الرسالة ---------- */

  function buildMessage(notesOverride) {
    var out = ["طلب عيّنة مجانية — ألياف الشمال", ""];

    var c = F.contactLines(contact);
    if (c.length) out.push("• بيانات التواصل"), out = out.concat(c, "");

    var a = F.answerLines(answers);
    if (a.length) out.push("• المنشأة والتوصيل"), out = out.concat(a, "");

    out.push("• العيّنات المطلوبة");
    window.allItems().forEach(function (i) {
      if (samples[i.id]) out.push("- " + i.name);
    });

    var used = window.allItems().filter(function (i) { return uses[i.id]; })
                     .map(function (i) { return i.name; });
    if (used.length) out.push("", "• الأصناف اللي بستهلكها", used.join(" · "));

    var notes = notesOverride !== undefined ? notesOverride : (notesEl.value || "").trim();
    if (notes) out.push("", "• ملاحظات", notes);

    out.push("", "أرجو إرسال العيّنات للتجربة.");
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

  renderSamples();
  if (restore(store.load())) {
    F.resumeBar(usesRoot.parentNode, restart);
  }
  refreshBar();
})();
