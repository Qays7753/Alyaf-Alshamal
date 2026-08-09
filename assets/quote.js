/* ============================================================
   صفحة طلب عرض السعر — كل شيء بالكبس، والملاحظات فقط كتابة
   ترسل الطلب مرتّباً على واتساب الشركة
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
      options: ["فرع واحد", "فرعان", "3 فروع", "4 فروع", "5 فروع", "6–10 فروع", "أكثر من 10 فروع"]
    },
    {
      id: "frequency",
      label: "عدد مرات التوصيل في الأسبوع",
      options: [
        { label: "يومياً", weekly: 6 },
        { label: "5 مرات", weekly: 5 },
        { label: "4 مرات", weekly: 4 },
        { label: "3 مرات", weekly: 3 },
        { label: "مرتان", weekly: 2 },
        { label: "مرة واحدة", weekly: 1 },
        { label: "حسب الطلب", weekly: 0 }
      ]
    },
    {
      id: "time",
      label: "وقت التوصيل المفضّل",
      options: ["6–9 صباحاً", "9–12 ظهراً", "12–4 عصراً", "4–8 مساءً", "أي وقت"]
    },
    {
      id: "start",
      label: "موعد بدء التوريد",
      options: ["فوراً", "خلال أسبوع", "خلال شهر", "استفسار فقط"]
    }
  ];

  /* حالة الطلب */
  var picks = {};   // itemId -> { qty, packIndex }
  var answers = {}; // questionId -> label

  var itemsRoot     = document.getElementById("items");
  var questionsRoot = document.getElementById("questions");
  var notesEl       = document.getElementById("notes");
  var countEl       = document.getElementById("sb-count");
  var totalEl       = document.getElementById("sb-total");
  var sendBtn       = document.getElementById("send");

  /* ---------- بناء قائمة الأصناف ---------- */

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

  function unitPrice(item, packIndex) {
    return item.unit === "piece"
      ? item.pricePerPiece
      : window.packPrice(item, item.packs[packIndex]);
  }

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

    var meta = document.createElement("div");
    meta.className = "pick-meta";
    meta.innerHTML = item.unit === "piece"
      ? "<bdi>" + window.money(item.pricePerPiece) + "</bdi> د للحبة"
      : "<bdi>" + window.money(item.pricePerKg) + "</bdi> د للكيلو";
    main.appendChild(meta);

    // اختيار وزن الكيس عند توفّر أكثر من وزن
    var packChips = null;
    if (item.packs && item.packs.length > 1) {
      packChips = document.createElement("div");
      packChips.className = "pack-chips";
      item.packs.forEach(function (g, idx) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "pack-chip";
        chip.textContent = window.packLabel(g);
        chip.setAttribute("aria-pressed", String(idx === 0));
        chip.addEventListener("click", function () {
          picks[item.id].packIndex = idx;
          Array.prototype.forEach.call(packChips.children, function (c, i) {
            c.setAttribute("aria-pressed", String(i === idx));
          });
          refreshRow();
          refreshBar();
        });
        packChips.appendChild(chip);
      });
      main.appendChild(packChips);
    }

    row.appendChild(main);

    // عدّاد الكمية
    var stepper = document.createElement("div");
    stepper.className = "stepper";

    var minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", "إنقاص كمية " + item.name);

    var out = document.createElement("output");
    out.textContent = "0";

    var plus = document.createElement("button");
    plus.type = "button";
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
      refreshRow();
      refreshBar();
    }

    function refreshRow() {
      var s = picks[item.id];
      out.textContent = String(s.qty);
      minus.disabled = s.qty === 0;
      row.classList.toggle("is-on", s.qty > 0);
      meta.innerHTML = s.qty > 0
        ? unitLabel(item, s.packIndex) + " — <bdi>" +
          window.money(unitPrice(item, s.packIndex) * s.qty) + "</bdi> د"
        : (item.unit === "piece"
            ? "<bdi>" + window.money(item.pricePerPiece) + "</bdi> د للحبة"
            : "<bdi>" + window.money(item.pricePerKg) + "</bdi> د للكيلو");
    }

    refreshRow();
    return row;
  }

  /* ---------- بناء أسئلة التوصيل ---------- */

  QUESTIONS.forEach(function (q) {
    var block = document.createElement("div");
    block.className = "q-block";
    block.dataset.qid = q.id;
    if (q.dependsOn) block.hidden = true;

    var label = document.createElement("div");
    label.className = "q-label";
    label.textContent = q.label;
    block.appendChild(label);

    var chips = document.createElement("div");
    chips.className = "chips";

    q.options.forEach(function (opt) {
      var text = typeof opt === "string" ? opt : opt.label;
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.innerHTML = window.bidiSafe(text);
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", function () {
        var isOn = chip.getAttribute("aria-pressed") === "true";
        Array.prototype.forEach.call(chips.children, function (c) {
          c.setAttribute("aria-pressed", "false");
        });
        if (isOn) {
          delete answers[q.id];
        } else {
          chip.setAttribute("aria-pressed", "true");
          answers[q.id] = text;
        }
        applyDependencies();
        refreshBar();
      });
      chips.appendChild(chip);
    });

    block.appendChild(chips);
    questionsRoot.appendChild(block);
  });

  function applyDependencies() {
    QUESTIONS.forEach(function (q) {
      if (!q.dependsOn) return;
      var block = questionsRoot.querySelector('[data-qid="' + q.id + '"]');
      var show = answers[q.dependsOn.id] === q.dependsOn.value;
      block.hidden = !show;
      if (!show && answers[q.id]) {
        delete answers[q.id];
        Array.prototype.forEach.call(block.querySelectorAll(".chip"), function (c) {
          c.setAttribute("aria-pressed", "false");
        });
      }
    });
  }

  /* ---------- الشريط السفلي ---------- */

  function selectedLines() {
    var lines = [];
    window.allItems().forEach(function (item) {
      var s = picks[item.id];
      if (!s || s.qty === 0) return;
      lines.push({
        item: item,
        qty: s.qty,
        unit: unitLabel(item, s.packIndex),
        total: unitPrice(item, s.packIndex) * s.qty
      });
    });
    return lines;
  }

  function weeklyFactor() {
    var q = QUESTIONS.filter(function (x) { return x.id === "frequency"; })[0];
    var chosen = answers.frequency;
    var hit = q.options.filter(function (o) { return o.label === chosen; })[0];
    return hit ? hit.weekly : 0;
  }

  function refreshBar() {
    var lines = selectedLines();
    var total = lines.reduce(function (a, l) { return a + l.total; }, 0);

    countEl.textContent = lines.length
      ? lines.length + (lines.length === 1 ? " صنف مختار" : " أصناف مختارة")
      : "لم تختر أي صنف بعد";
    totalEl.innerHTML = lines.length
      ? "<bdi>" + window.money(total) + "</bdi> د للتوصيلة"
      : "";
    sendBtn.disabled = lines.length === 0;
  }

  /* ---------- بناء رسالة الواتساب ---------- */

  function buildMessage() {
    var lines = selectedLines();
    var total = lines.reduce(function (a, l) { return a + l.total; }, 0);
    var out = ["طلب عرض سعر — ألياف الشمال", ""];

    var details = [];
    QUESTIONS.forEach(function (q) {
      if (answers[q.id]) details.push(q.label + ": " + answers[q.id]);
    });
    if (details.length) {
      out.push("• تفاصيل المنشأة والتوصيل");
      out = out.concat(details, "");
    }

    out.push("• الأصناف المطلوبة (لكل توصيلة)");
    lines.forEach(function (l) {
      out.push(
        "- " + l.item.name + ": " + l.qty + " × " + l.unit +
        " = " + window.money(l.total) + " د"
      );
    });
    out.push("");

    out.push("التقدير الأولي للتوصيلة: " + window.money(total) + " د");
    var w = weeklyFactor();
    if (w > 0) {
      out.push("التقدير الأسبوعي: " + window.money(total * w) + " د");
    }
    out.push("(تقدير مبدئي حسب أسعار القائمة وغير ملزم)");

    var notes = (notesEl.value || "").trim();
    if (notes) {
      out.push("", "• ملاحظات", notes);
    }

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
