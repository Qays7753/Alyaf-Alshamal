/* ============================================================
   صفحة "اعرف سعرك الخاص"
   • بدون أسعار — السعر النهائي يعتمد على تفاصيل الطلب
   • كل التفاصيل قوائم منسدلة، والكتابة فقط في الملاحظات
   • الطلب يوصل مرتّباً على واتساب الشركة
   ============================================================ */

(function () {
  "use strict";

  var AMMAN_AREAS = [
    "عبدون", "الصويفية", "الشميساني", "العبدلي", "جبل عمّان", "الرابية",
    "خلدا", "دابوق", "الجاردنز", "تلاع العلي", "الجبيهة", "صويلح",
    "شفا بدران", "أبو نصير", "مرج الحمام", "ناعور", "وادي السير",
    "البيادر", "طبربور", "ماركا", "القويسمة", "سحاب", "منطقة أخرى"
  ];

  var QUESTIONS = [
    {
      id: "facility",
      label: "نوع المنشأة",
      options: ["مطعم", "كافيه", "فندق", "مطبخ مركزي", "كاترينج", "سوبرماركت", "أخرى"]
    },
    {
      id: "governorate",
      label: "المحافظة",
      options: ["عمّان", "الزرقاء", "إربد", "البلقاء – السلط", "مادبا", "المفرق",
                "جرش", "عجلون", "الكرك", "الطفيلة", "معان", "العقبة"]
    },
    {
      id: "area",
      label: "المنطقة داخل عمّان",
      options: AMMAN_AREAS,
      dependsOn: { id: "governorate", value: "عمّان" }
    },
    {
      id: "branches",
      label: "عدد الفروع",
      options: ["فرع واحد", "فرعان", "ثلاثة فروع", "أربعة فروع", "خمسة فروع",
                "من ستة إلى عشرة فروع", "أكثر من عشرة فروع"]
    },
    {
      id: "frequency",
      label: "دورية التوصيل",
      options: ["يومياً", "خمس مرات أسبوعياً", "أربع مرات أسبوعياً",
                "ثلاث مرات أسبوعياً", "مرتان أسبوعياً", "مرة واحدة أسبوعياً",
                "حسب الطلب"]
    },
    {
      id: "time",
      label: "وقت التوصيل المفضّل",
      options: ["الصباح الباكر", "قبل الظهر", "بعد الظهر", "المساء", "أي وقت"]
    },
    {
      id: "start",
      label: "موعد بدء التوريد",
      options: ["فوراً", "خلال أسبوع", "خلال شهر", "استفسار فقط"]
    }
  ];

  var PLACEHOLDER = "— اختر —";

  /* حالة الطلب */
  var picks = {};   // itemId -> { qty, packIndex }
  var answers = {}; // questionId -> value

  var itemsRoot     = document.getElementById("items");
  var questionsRoot = document.getElementById("questions");
  var notesEl       = document.getElementById("notes");
  var countEl       = document.getElementById("sb-count");
  var hintEl        = document.getElementById("sb-hint");
  var sendBtn       = document.getElementById("send");

  /* ---------- قائمة الأصناف ---------- */

  window.CATALOGUE.forEach(function (group) {
    var wrap = document.createElement("div");
    wrap.className = "group";

    var heading = document.createElement("h3");
    heading.className = "group-heading";
    heading.textContent = group.group;
    wrap.appendChild(heading);

    group.items.forEach(function (item) {
      wrap.appendChild(buildPick(item));
    });

    itemsRoot.appendChild(wrap);
  });

  function unitLabel(item, packIndex) {
    return item.unit === "piece" ? "حبة" : "كيس " + window.packLabel(item.packs[packIndex]);
  }

  function buildPick(item) {
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

    // اختيار الحجم: قائمة منسدلة عند توفّر أكثر من حجم، وإلا نص ثابت
    if (item.packs && item.packs.length > 1) {
      var sel = document.createElement("select");
      sel.className = "size-select";
      sel.setAttribute("aria-label", "حجم كيس " + item.name);
      item.packs.forEach(function (g, idx) {
        var opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = "كيس " + window.packLabel(g);
        sel.appendChild(opt);
      });
      sel.addEventListener("change", function () {
        picks[item.id].packIndex = Number(sel.value);
      });
      main.appendChild(sel);
    } else {
      var fixed = document.createElement("div");
      fixed.className = "pick-size";
      fixed.textContent = unitLabel(item, 0);
      main.appendChild(fixed);
    }

    row.appendChild(main);

    // عدّاد الكمية
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
      s.qty = Math.max(0, Math.min(999, s.qty + d));
      out.textContent = String(s.qty);
      minus.disabled = s.qty === 0;
      row.classList.toggle("is-on", s.qty > 0);
      refreshBar();
    }

    minus.disabled = true;
    return row;
  }

  /* ---------- تفاصيل التوصيل: قوائم منسدلة ---------- */

  QUESTIONS.forEach(function (q) {
    var field = document.createElement("div");
    field.className = "field";
    field.dataset.qid = q.id;
    if (q.dependsOn) field.hidden = true;

    var label = document.createElement("label");
    label.className = "field-label";
    label.setAttribute("for", "q-" + q.id);
    label.textContent = q.label;
    field.appendChild(label);

    var sel = document.createElement("select");
    sel.className = "field-select is-empty";
    sel.id = "q-" + q.id;

    var ph = document.createElement("option");
    ph.value = "";
    ph.textContent = PLACEHOLDER;
    sel.appendChild(ph);

    q.options.forEach(function (opt) {
      var o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    });

    sel.addEventListener("change", function () {
      if (sel.value) answers[q.id] = sel.value;
      else delete answers[q.id];
      sel.classList.toggle("is-empty", !sel.value);
      applyDependencies();
    });

    field.appendChild(sel);
    questionsRoot.appendChild(field);
  });

  function applyDependencies() {
    QUESTIONS.forEach(function (q) {
      if (!q.dependsOn) return;
      var field = questionsRoot.querySelector('[data-qid="' + q.id + '"]');
      var show = answers[q.dependsOn.id] === q.dependsOn.value;
      field.hidden = !show;
      if (!show) {
        delete answers[q.id];
        var sel = field.querySelector("select");
        sel.value = "";
        sel.classList.add("is-empty");
      }
    });
  }

  /* ---------- الشريط السفلي ---------- */

  function selectedLines() {
    var lines = [];
    window.allItems().forEach(function (item) {
      var s = picks[item.id];
      if (!s || s.qty === 0) return;
      lines.push({ name: item.name, qty: s.qty, unit: unitLabel(item, s.packIndex) });
    });
    return lines;
  }

  function refreshBar() {
    var n = selectedLines().length;
    countEl.textContent = n
      ? n + (n === 1 ? " صنف مختار" : " أصناف مختارة")
      : "لم تختر أي صنف بعد";
    hintEl.textContent = n ? "جاهز للإرسال" : "اختر صنف واحد على الأقل";
    sendBtn.disabled = n === 0;
  }

  /* ---------- رسالة الواتساب ---------- */

  function buildMessage() {
    var out = ["طلب عرض سعر — ألياف الشمال", ""];

    var details = [];
    QUESTIONS.forEach(function (q) {
      if (answers[q.id]) details.push(q.label + ": " + answers[q.id]);
    });
    if (details.length) {
      out.push("• المنشأة والتوصيل");
      out = out.concat(details, "");
    }

    out.push("• الأصناف والكميات المطلوبة في كل توصيلة");
    selectedLines().forEach(function (l) {
      out.push("- " + l.name + ": " + l.qty + " × " + l.unit);
    });

    var notes = (notesEl.value || "").trim();
    if (notes) out.push("", "• ملاحظات", notes);

    out.push("", "أرجو تزويدي بعرض سعر مخصّص.");
    return out.join("\n");
  }

  sendBtn.addEventListener("click", function () {
    if (sendBtn.disabled) return;
    var url = "https://wa.me/" + window.WHATSAPP_NUMBER +
              "?text=" + encodeURIComponent(buildMessage());
    window.open(url, "_blank", "noopener");
  });

  refreshBar();
})();
