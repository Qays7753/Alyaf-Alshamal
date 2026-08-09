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

    // 2) اسم الصنف
    var name = document.createElement("div");
    name.className = "name";
    name.textContent = item.name;
    li.appendChild(name);

    // 3) عمود الأحجام المتوفّرة
    var sizes = document.createElement("div");
    sizes.className = "sizes";
    if (item.unit === "piece") {
      sizes.innerHTML = "<span class='size'>حبة</span>";
    } else {
      item.packs.forEach(function (g) {
        var s = document.createElement("span");
        s.className = "size";
        s.innerHTML = "<bdi>" + window.packLabel(g) + "</bdi>";
        sizes.appendChild(s);
      });
    }
    li.appendChild(sizes);

    // 4) سعر الكيلو، والوحدة على الجنب
    var price = document.createElement("div");
    price.className = "price";
    price.innerHTML = item.unit === "piece"
      ? "<b>" + window.money(item.pricePerPiece) + "</b> <small>د/حبة</small>"
      : "<b>" + window.money(item.pricePerKg) + "</b> <small>د/كغ</small>";
    li.appendChild(price);

    return li;
  }
})();
