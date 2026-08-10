/* ============================================================
   صفحة "اعرف سعرك الخاص"
   • بدون أسعار — السعر النهائي يعتمد على تفاصيل الطلب
   • كل التفاصيل قوائم منسدلة، والكتابة فقط في الملاحظات
   • الطلب يوصل مرتّباً على واتساب الشركة
   • حفظ الحالة في localStorage لمنع فقدان الطلب
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
  var MAX_QTY = 999;
  var STORAGE_KEY = "alyaf.quote.v1";
  var SEND_COOLDOWN_MS = 3000;

  /* حالة الطلب */
  var picks = {};   // itemId -> { qty, packIndex }
  var answers = {}; // questionId -> value

  var itemsRoot     = document.getElementById("items");
  var questionsRoot = document.getElementById("questions");
  var notesEl       = document.getElementById("notes");
  var countEl       = document.getElementById("sb-count");
  var hintEl        = document.getElementById("sb-hint");
  var sendBtn       = document.getElementById("send");

  /* ---------- منطقة إعلان قارئ الشاشة ---------- */
  var srLive = document.createElement("div");
  srLive.setAttribute("aria-live", "polite");
  srLive.setAttribute("aria-atomic", "true");
  srLive.className = "sr-only";
  document.body.appendChild(srLive);

  function announce(msg) {
    srLive.textContent = "";
    // تأخير قصير لضمان إعادة الإعلان
    setTimeout(function () { srLive.textContent = msg; }, 50);
  }

  /* ---------- حفظ واستعادة الحالة ---------- */

  function saveState() {
    try {
      var state = {
        picks: {},
        answers: answers,
        notes: notesEl.value || ""
      };
      // نسخ picks مع تجاهل المراجع الدائرية
      Object.keys(picks).forEach(function (id) {
        state.picks[id] = { qty: picks[id].qty, packIndex: picks[id].packIndex };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // وضع التصفح الخاص أو امتلاء التخزين — نتجاهل بصمت
    }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // تجاهل
    }
  }

  /* ---------- شريط الاستئناف ---------- */

  function maybeShowResumeBar(saved) {
    if (!saved || !saved.picks) return;
    var hasItems = Object.keys(saved.picks).some(function (id) {
      return saved.picks[id] && saved.picks[id].qty > 0;
    });
    if (!hasItems) return;

    var bar = document.createElement("div");
    bar.className = "resume-bar";
    bar.setAttribute("role", "alert");

    var text = document.createElement("span");
    text.textContent = "رجّعنالك طلبك السابق";
    bar.appendChild(text);

    var actions = document.createElement("div");
    actions.className = "resume-actions";

    var restartBtn = document.createElement("button");
    restartBtn.type = "button";
    restartBtn.className = "resume-btn restart";
    restartBtn.textContent = "ابدأ من جديد";

    var continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.className = "resume-btn continue";
    continueBtn.textContent = "متابعة";

    actions.appendChild(restartBtn);
    actions.appendChild(continueBtn);
    bar.appendChild(actions);

    // إدراج الشريط قبل قسم الخطوات
    var steps = document.querySelector(".steps");
    if (steps && steps.parentNode) {
      steps.parentNode.insertBefore(bar, steps);
    } else {
      itemsRoot.parentNode.insertBefore(bar, itemsRoot);
    }

    restartBtn.addEventListener("click", function () {
      clearState();
      // إعادة تحميل الصفحة لضمان حالة نظيفة
      window.location.reload();
    });

    continueBtn.addEventListener("click", function () {
      bar.remove();
    });

    announce("لديك طلب سابق محفوظ. اضغط متابعة للاستمرار أو ابدأ من جديد");
  }

  /* ---------- تطبيق الحالة المحفوظة على العناصر ---------- */

  function applySavedState(saved) {
    if (!saved) return;

    // استعادة الملاحظات
    if (saved.notes && notesEl) {
      notesEl.value = saved.notes;
    }

    // استعادة الإجابات (تُطبّق بعد بناء القوائم)
    if (saved.answers) {
      Object.keys(saved.answers).forEach(function (qid) {
        answers[qid] = saved.answers[qid];
      });
    }

    // استعادة picks (تُطبّق بعد بناء الصفوف)
    if (saved.picks) {
      Object.keys(saved.picks).forEach(function (id) {
        if (picks[id] && saved.picks[id]) {
          picks[id].qty = saved.picks[id].qty || 0;
          picks[id].packIndex = saved.picks[id].packIndex || 0;
        }
      });
    }
  }

  /* ---------- مزامنة عناصر الواجهة مع الحالة ---------- */

  function syncUIFromState() {
    // مزامنة عدّادات الكمية
    Object.keys(picks).forEach(function (id) {
      var s = picks[id];
      // إيجاد صف الصنف عبر data-attribute
      var row = itemsRoot.querySelector('[data-item-id="' + id + '"]');
      if (!row) return;

      var out = row.querySelector("output");
      var minus = row.querySelector(".step-btn");
      if (out) out.textContent = String(s.qty);
      if (minus) minus.disabled = s.qty === 0;
      row.classList.toggle("is-on", s.qty > 0);

      // مزامنة اختيار الحجم إن وجد
      var sizeSel = row.querySelector(".size-select");
      if (sizeSel && s.packIndex !== undefined) {
        sizeSel.value = String(s.packIndex);
      }
    });

    // مزامنة القوائم المنسدلة
    QUESTIONS.forEach(function (q) {
      var sel = document.getElementById("q-" + q.id);
      if (!sel) return;
      if (answers[q.id]) {
        sel.value = answers[q.id];
        sel.classList.remove("is-empty");
      }
    });

    // تطبيق التبعيات (إظهار/إخفاء حقل المنطقة)
    applyDependencies();

    refreshBar();
  }

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
    row.setAttribute("data-item-id", item.id);

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
        saveState();
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
    out.setAttribute("aria-live", "off"); // نعلن يدوياً لتجنب التكرار

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
      var prevQty = s.qty;
      s.qty = Math.max(0, Math.min(MAX_QTY, s.qty + d));
      out.textContent = String(s.qty);
      minus.disabled = s.qty === 0;
      row.classList.toggle("is-on", s.qty > 0);

      // إعلان صريح عند الوصول للحد الأقصى
      if (d > 0 && s.qty === MAX_QTY && prevQty < MAX_QTY) {
        announce("وصلت للحد الأقصى: " + MAX_QTY + " كيس لكل صنف. لتطلب كمية أكبر، اكتبها في الملاحظات");
      } else if (d > 0) {
        announce(item.name + ": " + s.qty);
      }

      saveState();
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
      saveState();
    });

    field.appendChild(sel);
    questionsRoot.appendChild(field);
  });

  function applyDependencies() {
    QUESTIONS.forEach(function (q) {
      if (!q.dependsOn) return;
      var field = questionsRoot.querySelector('[data-qid="' + q.id + '"]');
      if (!field) return;
      var show = answers[q.dependsOn.id] === q.dependsOn.value;
      field.hidden = !show;
      if (!show) {
        delete answers[q.id];
        var sel = field.querySelector("select");
        if (sel) {
          sel.value = "";
          sel.classList.add("is-empty");
        }
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
    sendBtn.disabled = n === 0 || sendBtn.dataset.cooling === "1";
  }

  /* ---------- رسالة الواتساب ---------- */

  var URL_LIMIT = 8000; // الحد العملي لـ wa.me
  var NOTES_TRUNCATE_MARKER = "… (تم اختصار الملاحظات — سأكملها في الواتساب)";

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

    out.push("• الأصناف والكميات");
    selectedLines().forEach(function (l) {
      out.push("- " + l.name + ": " + l.qty + " × " + l.unit);
    });

    var notes = (notesEl.value || "").trim();
    if (notes) out.push("", "• ملاحظات", notes);

    out.push("", "أرجو تزويدي بعرض سعر مخصّص.");
    return out.join("\n");
  }

  /* ---------- فحص طول URL واختصار الملاحظات عند الضرورة ---------- */

  function buildUrl() {
    var message = buildMessage();
    var baseUrl = "https://wa.me/" + window.WHATSAPP_NUMBER + "?text=";
    var encoded = encodeURIComponent(message);
    var url = baseUrl + encoded;

    // إذا تجاوز URL الحد، نختصر الملاحظات تدريجياً
    if (url.length > URL_LIMIT) {
      var notes = (notesEl.value || "").trim();
      if (notes) {
        // حساب المساحة المتاحة للملاحظات
        var overhead = baseUrl.length + encodeURIComponent(
          buildMessage().replace(notes, "")
        ).length + 20; // 20 للـ"\n• ملاحظات\n" والmarker
        var budget = URL_LIMIT - overhead;
        // كل حرف عربي ≈ 6 bytes في URL encoding
        var maxNotesChars = Math.max(50, Math.floor(budget / 6) - NOTES_TRUNCATE_MARKER.length);

        if (notes.length > maxNotesChars) {
          var truncated = notes.substring(0, maxNotesChars) + NOTES_TRUNCATE_MARKER;
          // إعادة بناء الرسالة مع الملاحظات المختصرة
          var lines = ["طلب عرض سعر — ألياف الشمال", ""];
          var details = [];
          QUESTIONS.forEach(function (q) {
            if (answers[q.id]) details.push(q.label + ": " + answers[q.id]);
          });
          if (details.length) {
            lines.push("• المنشأة والتوصيل");
            lines = lines.concat(details, "");
          }
          lines.push("• الأصناف والكميات");
          selectedLines().forEach(function (l) {
            lines.push("- " + l.name + ": " + l.qty + " × " + l.unit);
          });
          lines.push("", "• ملاحظات", truncated);
          lines.push("", "أرجو تزويدي بعرض سعر مخصّص.");
          message = lines.join("\n");
          encoded = encodeURIComponent(message);
          url = baseUrl + encoded;
        }
      }
    }

    return { url: url, length: url.length, truncated: url.length > URL_LIMIT };
  }

  /* ---------- الإرسال مع التحقق والتأكيد ---------- */

  var confirmationBanner = null;

  function showConfirmation() {
    if (confirmationBanner) confirmationBanner.remove();

    confirmationBanner = document.createElement("div");
    confirmationBanner.className = "send-confirm";
    confirmationBanner.setAttribute("role", "status");

    var icon = document.createElement("span");
    icon.className = "send-confirm-icon";
    icon.textContent = "✓";

    var text = document.createElement("span");
    text.className = "send-confirm-text";
    text.textContent = "فتحنا لك واتساب — اضغط إرسال فيه لتأكيد طلبك";

    confirmationBanner.appendChild(icon);
    confirmationBanner.appendChild(text);

    // إدراج قبل الشريط السفلي
    var sendbar = document.querySelector(".sendbar");
    if (sendbar && sendbar.parentNode) {
      sendbar.parentNode.insertBefore(confirmationBanner, sendbar);
    }

    announce("فتحنا لك واتساب. اضغط إرسال في واتساب لتأكيد طلبك");

    // إزالة البانر تلقائياً بعد 10 ثوانٍ
    setTimeout(function () {
      if (confirmationBanner && confirmationBanner.parentNode) {
        confirmationBanner.remove();
        confirmationBanner = null;
      }
    }, 10000);
  }

  function showSendError() {
    if (confirmationBanner) confirmationBanner.remove();

    confirmationBanner = document.createElement("div");
    confirmationBanner.className = "send-error";
    confirmationBanner.setAttribute("role", "alert");

    var text = document.createElement("span");
    text.className = "send-error-text";
    text.textContent = "تعذّر فتح واتساب — اتصل مباشرة: ";

    var telLink = document.createElement("a");
    telLink.href = "tel:0777717753";
    telLink.textContent = "0777717753";
    telLink.className = "send-error-tel";

    text.appendChild(telLink);
    confirmationBanner.appendChild(text);

    var sendbar = document.querySelector(".sendbar");
    if (sendbar && sendbar.parentNode) {
      sendbar.parentNode.insertBefore(confirmationBanner, sendbar);
    }

    announce("تعذّر فتح واتساب. اتصل على 0777717753");
  }

  sendBtn.addEventListener("click", function () {
    if (sendBtn.disabled) return;
    if (sendBtn.dataset.cooling === "1") return;

    var result = buildUrl();
    var url = result.url;

    var opened = false;
    try {
      var win = window.open(url, "_blank", "noopener");
      if (win === null) {
        setTimeout(function () {
          showConfirmation();
        }, 300);
      } else {
        opened = true;
        showConfirmation();
      }
    } catch (e) {
      opened = false;
    }

    if (!opened) {
      setTimeout(function () {
        if (!confirmationBanner || !confirmationBanner.classList.contains("send-confirm")) {
          showConfirmation();
        }
      }, 500);
    }

    // تعطيل الزر لمدة 3 ثوانٍ لمنع الإرسال المزدوج
    sendBtn.dataset.cooling = "1";
    var originalText = sendBtn.innerHTML;
    sendBtn.innerHTML = '<span class="send-btn-sent">✓ تم الفتح</span>';
    refreshBar();

    setTimeout(function () {
      sendBtn.dataset.cooling = "0";
      sendBtn.innerHTML = originalText;
      refreshBar();
    }, SEND_COOLDOWN_MS);
  });

  /* ---------- حفظ الملاحظات عند الكتابة ---------- */

  if (notesEl) {
    var notesTimer = null;
    notesEl.addEventListener("input", function () {
      if (notesTimer) clearTimeout(notesTimer);
      notesTimer = setTimeout(saveState, 400);
    });
  }

  /* ---------- الاستعادة عند تحميل الصفحة ---------- */

  var saved = loadState();
  if (saved) {
    applySavedState(saved);
    syncUIFromState();
    maybeShowResumeBar(saved);
  } else {
    refreshBar();
  }

})();
