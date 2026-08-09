/* ============================================================
   بناء قائمة الأسعار من ملف البيانات products.js
   السعر الأساسي = سعر الكيلو، وتحته سعر الكيس الفعلي
   ============================================================ */

(function () {
  "use strict";

  var root = document.getElementById("catalogue");
  if (!root) return;

  window.CATALOGUE.forEach(function (group) {
    var section = document.createElement("div");
    section.className = "group";

    var heading = document.createElement("h2");
    heading.className = "group-heading";
    heading.textContent = group.group;
    section.appendChild(heading);

    var list = document.createElement("ul");

    group.items.forEach(function (item) {
      list.appendChild(buildLine(item));
    });

    section.appendChild(list);
    root.appendChild(section);
  });

  // تلميح الصور يظهر فقط بعد إضافة صور فعلية لأي صنف
  var hint = document.getElementById("photo-hint");
  if (hint) {
    var hasImages = window.allItems().some(function (i) {
      return (i.images || []).length > 0;
    });
    hint.hidden = !hasImages;
  }

  function buildLine(item) {
    var li = document.createElement("li");
    li.className = "line";

    // 1) كبسة الصورة
    var btn = window.Gallery.createButton(item);
    if (btn) li.appendChild(btn);
    else li.classList.add("no-photo");

    // 2) الاسم + أسعار الأكياس
    var main = document.createElement("div");
    main.className = "line-main";

    var name = document.createElement("div");
    name.className = "name";
    name.textContent = item.name;
    main.appendChild(name);

    var packs = document.createElement("div");
    packs.className = "packs";

    if (item.unit === "piece") {
      packs.innerHTML = "<span>تُباع بالحبة</span>";
    } else {
      item.packs.forEach(function (g) {
        var s = document.createElement("span");
        s.innerHTML =
          "كيس <bdi>" + window.packLabel(g) + "</bdi> — <bdi>" +
          window.money(window.packPrice(item, g)) + "</bdi> د";
        packs.appendChild(s);
      });
    }
    main.appendChild(packs);
    li.appendChild(main);

    // 3) سعر الكيلو
    var price = document.createElement("div");
    price.className = "price";
    if (item.unit === "piece") {
      price.innerHTML =
        "<b>" + window.money(item.pricePerPiece) + "</b><small>د / حبة</small>";
    } else {
      price.innerHTML =
        "<b>" + window.money(item.pricePerKg) + "</b><small>د / كغ</small>";
    }
    li.appendChild(price);

    return li;
  }
})();
