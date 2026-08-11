/* ============================================================
   بناء قائمة الأسعار من ملف البيانات products.js
   السعر الأساسي = سعر الكيلو، وتحته سعر الكيس الفعلي
   ============================================================ */

(function () {
  "use strict";

  var root = document.getElementById("catalogue");
  if (!root) return;

  // عمود الصورة محجوز للجميع ما دام في كبسة واحدة على الأقل،
  // حتى تبقى كل الأعمدة على استقامة واحدة بين الصفوف
  var hasImages = window.allItems().some(function (i) {
    return (i.images || []).length > 0;
  });
  var showPhotoCol = !window.HIDE_EMPTY_IMAGE_BUTTONS || hasImages;
  if (!showPhotoCol) root.classList.add("no-photo-col");

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

    // 1) كبسة الصورة — أو خانة فارغة تحفظ محاذاة الأعمدة
    if (showPhotoCol) {
      li.appendChild(window.Gallery.createButton(item) || document.createElement("span"));
    }

    // 2) اسم الصنف — بلا أي ذكر لأحجام التعبئة حتى تبقى وحدة واحدة
    var name = document.createElement("div");
    name.className = "name";
    name.textContent = item.name;
    li.appendChild(name);

    // 3) سعر الكيلو، والوحدة على الجنب
    var price = document.createElement("div");
    price.className = "price";
    price.innerHTML = item.unit === "piece"
      ? "<b>" + window.money(item.pricePerPiece) + "</b> <small>د/حبة</small>"
      : "<b>" + window.money(item.pricePerKg) + "</b> <small>د/كغ</small>";
    li.appendChild(price);

    return li;
  }
})();
