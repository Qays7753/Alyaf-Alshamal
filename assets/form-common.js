/* ============================================================
   منطق مشترك بين صفحة عرض السعر وصفحة العيّنة المجانية
   • أسئلة المنشأة والتوصيل (قوائم منسدلة)
   • بيانات التواصل (اسم المنشأة والمسؤول والهاتف والموقع)
   • الحفظ في localStorage والاستئناف
   • إرسال الطلب على واتساب مع التأكيد ومعالجة الفشل
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
    { id: "facility", label: "نوع المنشأة",
      options: ["مطعم", "كافيه", "فندق", "مطبخ مركزي", "كاترينج", "سوبرماركت", "أخرى"] },
    { id: "governorate", label: "المحافظة",
      options: ["عمّان", "الزرقاء", "إربد", "البلقاء – السلط", "مادبا", "المفرق",
                "جرش", "عجلون", "الكرك", "الطفيلة", "معان", "العقبة"] },
    { id: "area", label: "المنطقة داخل عمّان", options: AMMAN_AREAS,
      dependsOn: { id: "governorate", value: "عمّان" } },
    { id: "branches", label: "عدد الفروع",
      options: ["فرع واحد", "فرعان", "ثلاثة فروع", "أربعة فروع", "خمسة فروع",
                "من ستة إلى عشرة فروع", "أكثر من عشرة فروع"] },
    { id: "frequency", label: "دورية التوصيل",
      options: ["يومياً", "خمس مرات أسبوعياً", "أربع مرات أسبوعياً",
                "ثلاث مرات أسبوعياً", "مرتان أسبوعياً", "مرة واحدة أسبوعياً",
                "حسب الطلب"] },
    { id: "time", label: "وقت التوصيل المفضّل",
      options: ["الصباح الباكر", "قبل الظهر", "بعد الظهر", "المساء", "أي وقت"] },
    { id: "start", label: "موعد بدء التوريد",
      options: ["فوراً", "خلال أسبوع", "خلال شهر", "استفسار فقط"] }
  ];

  var PLACEHOLDER = "— اختر —";
  var URL_LIMIT = 8000;
  var SEND_COOLDOWN_MS = 3000;

  /* ---------- إعلان لقارئ الشاشة ---------- */

  var srLive = document.createElement("div");
  srLive.setAttribute("aria-live", "polite");
  srLive.setAttribute("aria-atomic", "true");
  srLive.className = "sr-only";
  document.body.appendChild(srLive);

  function announce(msg) {
    srLive.textContent = "";
    setTimeout(function () { srLive.textContent = msg; }, 50);
  }

  /* ---------- التخزين المحلي ---------- */

  function storage(key) {
    return {
      save: function (state) {
        try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
      },
      load: function () {
        try {
          var raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
      },
      clear: function () {
        try { localStorage.removeItem(key); } catch (e) {}
      }
    };
  }

  /* ---------- أسئلة المنشأة والتوصيل ---------- */

  function buildQuestions(root, answers, onChange) {
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
        applyDependencies(root, answers);
        onChange();
      });

      field.appendChild(sel);
      root.appendChild(field);
    });
  }

  function applyDependencies(root, answers) {
    QUESTIONS.forEach(function (q) {
      if (!q.dependsOn) return;
      var field = root.querySelector('[data-qid="' + q.id + '"]');
      if (!field) return;
      var show = answers[q.dependsOn.id] === q.dependsOn.value;
      field.hidden = !show;
      if (!show) {
        delete answers[q.id];
        var sel = field.querySelector("select");
        if (sel) { sel.value = ""; sel.classList.add("is-empty"); }
      }
    });
  }

  function syncQuestions(root, answers) {
    QUESTIONS.forEach(function (q) {
      var sel = root.querySelector("#q-" + q.id);
      if (!sel) return;
      var v = answers[q.id] || "";
      sel.value = v;
      sel.classList.toggle("is-empty", !v);
    });
    applyDependencies(root, answers);
  }

  /* ---------- بيانات التواصل ---------- */

  var CONTACT_FIELDS = [
    { id: "company", label: "اسم المنشأة", required: true, type: "text",
      placeholder: "مثال: مطعم البركة", autocomplete: "organization" },
    { id: "person", label: "اسم المسؤول", type: "text",
      placeholder: "مين نسأل عنه", autocomplete: "name" },
    { id: "phone", label: "رقم للتواصل", type: "tel",
      placeholder: "07XXXXXXXX", autocomplete: "tel", inputmode: "tel" }
  ];

  function buildContact(root, contact, onChange) {
    CONTACT_FIELDS.forEach(function (f) {
      var field = document.createElement("div");
      field.className = "field";

      var label = document.createElement("label");
      label.className = "field-label";
      label.setAttribute("for", "c-" + f.id);
      label.textContent = f.label;
      if (f.required) {
        var req = document.createElement("span");
        req.className = "field-req";
        req.textContent = "مطلوب";
        label.appendChild(req);
      } else {
        var opt = document.createElement("span");
        opt.className = "field-opt";
        opt.textContent = "اختياري";
        label.appendChild(opt);
      }
      field.appendChild(label);

      var input = document.createElement("input");
      input.type = f.type;
      input.id = "c-" + f.id;
      input.className = "field-input";
      input.placeholder = f.placeholder;
      input.autocomplete = f.autocomplete;
      if (f.inputmode) input.setAttribute("inputmode", f.inputmode);
      if (f.required) input.setAttribute("aria-required", "true");

      input.addEventListener("input", function () {
        contact[f.id] = input.value;
        field.classList.remove("has-error");
        onChange();
      });

      field.appendChild(input);
      root.appendChild(field);
    });

    root.appendChild(buildLocationField(contact, onChange));
  }

  function buildLocationField(contact, onChange) {
    var field = document.createElement("div");
    field.className = "field";

    var label = document.createElement("span");
    label.className = "field-label";
    label.textContent = "موقع الاستلام";
    var opt = document.createElement("span");
    opt.className = "field-opt";
    opt.textContent = "اختياري — كبسة وحدة";
    label.appendChild(opt);
    field.appendChild(label);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "geo-btn";

    var status = document.createElement("p");
    status.className = "geo-status";
    status.hidden = true;

    function render() {
      if (contact.location) {
        btn.innerHTML = pinIcon() + "<span>تغيير الموقع</span>";
        btn.classList.add("is-set");
        status.hidden = false;
        status.className = "geo-status is-ok";
        status.textContent = "تم تحديد موقعك — رح يوصل رابط الخريطة مع طلبك";
      } else {
        btn.innerHTML = pinIcon() + "<span>شارك موقعك</span>";
        btn.classList.remove("is-set");
      }
    }

    btn.addEventListener("click", function () {
      if (!navigator.geolocation) {
        status.hidden = false;
        status.className = "geo-status is-err";
        status.textContent = "متصفحك ما بيدعم تحديد الموقع — اختر منطقتك من القائمة فوق";
        return;
      }
      btn.disabled = true;
      btn.innerHTML = pinIcon() + "<span>عم نحدد موقعك…</span>";
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          contact.location = {
            lat: +pos.coords.latitude.toFixed(6),
            lng: +pos.coords.longitude.toFixed(6)
          };
          btn.disabled = false;
          render();
          announce("تم تحديد موقعك");
          onChange();
        },
        function () {
          btn.disabled = false;
          render();
          status.hidden = false;
          status.className = "geo-status is-err";
          status.textContent = "ما قدرنا نوصل لموقعك — تأكد إنك سمحت للمتصفح، أو اختر منطقتك من القائمة فوق";
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });

    render();
    field.appendChild(btn);
    field.appendChild(status);
    return field;
  }

  function pinIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/>' +
      '<circle cx="12" cy="10" r="2.6"/></svg>';
  }

  function syncContact(root, contact) {
    CONTACT_FIELDS.forEach(function (f) {
      var input = root.querySelector("#c-" + f.id);
      if (input) input.value = contact[f.id] || "";
    });
  }

  /** يعيد اسم أول حقل مطلوب فارغ، أو null إذا كله مكتمل */
  function missingRequired(contact) {
    var i;
    for (i = 0; i < CONTACT_FIELDS.length; i++) {
      if (CONTACT_FIELDS[i].required && !(contact[CONTACT_FIELDS[i].id] || "").trim()) {
        return CONTACT_FIELDS[i];
      }
    }
    return null;
  }

  function flagMissing(root, contact) {
    var miss = missingRequired(contact);
    if (!miss) return false;
    var input = root.querySelector("#c-" + miss.id);
    if (input) {
      input.parentNode.classList.add("has-error");
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      announce(miss.label + " مطلوب");
    }
    return true;
  }

  /** أسطر بيانات التواصل الجاهزة للرسالة */
  function contactLines(contact) {
    var lines = [];
    if (contact.company) lines.push("المنشأة: " + contact.company.trim());
    if (contact.person) lines.push("المسؤول: " + contact.person.trim());
    if (contact.phone) lines.push("هاتف: " + contact.phone.trim());
    if (contact.location) {
      lines.push("الموقع: https://maps.google.com/?q=" +
                 contact.location.lat + "," + contact.location.lng);
    }
    return lines;
  }

  /** أسطر أسئلة المنشأة والتوصيل الجاهزة للرسالة */
  function answerLines(answers) {
    var lines = [];
    QUESTIONS.forEach(function (q) {
      if (answers[q.id]) lines.push(q.label + ": " + answers[q.id]);
    });
    return lines;
  }

  /* ---------- شريط الاستئناف ---------- */

  function resumeBar(container, onRestart) {
    var bar = document.createElement("div");
    bar.className = "resume-bar";

    var text = document.createElement("span");
    text.className = "resume-text";
    text.textContent = "رجّعنالك طلبك السابق";
    bar.appendChild(text);

    var restart = document.createElement("button");
    restart.type = "button";
    restart.className = "resume-btn";
    restart.textContent = "ابدأ من جديد";
    restart.addEventListener("click", function () {
      onRestart();
      bar.remove();
      announce("تم مسح الطلب السابق");
    });
    bar.appendChild(restart);

    container.insertBefore(bar, container.firstChild);
  }

  /* ---------- الإرسال ---------- */

  function banner(cls, role, build) {
    var old = document.querySelector(".send-banner");
    if (old) old.remove();
    var el = document.createElement("div");
    el.className = "send-banner " + cls;
    el.setAttribute("role", role);
    build(el);
    var sendbar = document.querySelector(".sendbar");
    if (sendbar && sendbar.parentNode) sendbar.parentNode.insertBefore(el, sendbar);
    return el;
  }

  function showSent() {
    var el = banner("is-ok", "status", function (e) {
      e.innerHTML = '<span class="send-banner-icon">✓</span>' +
        '<span>فتحنا لك واتساب — اضغط إرسال فيه لتأكيد طلبك</span>';
    });
    announce("فتحنا لك واتساب. اضغط إرسال في واتساب لتأكيد طلبك");
    setTimeout(function () { if (el.parentNode) el.remove(); }, 12000);
  }

  function showFailed() {
    banner("is-err", "alert", function (e) {
      e.innerHTML = '<span>تعذّر فتح واتساب — اتصل مباشرة على ' +
        '<a href="tel:+962777717753">0777717753</a></span>';
    });
    announce("تعذّر فتح واتساب. اتصل على 0777717753");
  }

  /**
   * يبني الرابط ويفتحه، مع اختصار الملاحظات إذا تجاوز الرابط الحد العملي.
   * buildMessage(notesOverride) يجب أن يعيد نص الرسالة كاملاً.
   */
  function send(sendBtn, buildMessage, notesEl, refresh) {
    var base = "https://wa.me/" + window.WHATSAPP_NUMBER + "?text=";
    var url = base + encodeURIComponent(buildMessage());

    if (url.length > URL_LIMIT && notesEl && notesEl.value) {
      var notes = notesEl.value.trim();
      var withoutNotes = base + encodeURIComponent(buildMessage(""));
      var budget = URL_LIMIT - withoutNotes.length - 120;
      var maxChars = Math.max(40, Math.floor(budget / 6));
      if (notes.length > maxChars) {
        url = base + encodeURIComponent(
          buildMessage(notes.substring(0, maxChars) + "… (بكمّل الملاحظات بالواتساب)")
        );
      }
    }

    var opened = false;
    try {
      opened = window.open(url, "_blank", "noopener") !== null;
    } catch (e) {
      opened = false;
    }

    if (opened) showSent(); else showFailed();

    sendBtn.dataset.cooling = "1";
    var original = sendBtn.innerHTML;
    sendBtn.innerHTML = '<span>✓ تم الفتح</span>';
    refresh();
    setTimeout(function () {
      sendBtn.dataset.cooling = "0";
      sendBtn.innerHTML = original;
      refresh();
    }, SEND_COOLDOWN_MS);
  }

  window.Form = {
    QUESTIONS: QUESTIONS,
    storage: storage,
    announce: announce,
    buildQuestions: buildQuestions,
    syncQuestions: syncQuestions,
    buildContact: buildContact,
    syncContact: syncContact,
    missingRequired: missingRequired,
    flagMissing: flagMissing,
    contactLines: contactLines,
    answerLines: answerLines,
    resumeBar: resumeBar,
    send: send
  };
})();
