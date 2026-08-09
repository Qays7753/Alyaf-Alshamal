/* ============================================================
   بيانات كتالوج ألياف الشمال — المصدر الوحيد لكل الصفحات
   ------------------------------------------------------------
   • لتعديل سعر صنف: غيّر pricePerKg فقط.
     أسعار الأكياس تُحتسب تلقائياً = pricePerKg × وزن الكيس ÷ 1000

   • لإضافة أو تعديل أوزان الأكياس: عدّل مصفوفة packs (بالغرام).
     مثال: packs: [100, 250, 1000]

   • لإضافة صور لصنف: ضع الصور داخل assets/products/
     واكتب أسماء الملفات داخل images، مثال:
       images: ["rocket-1.webp", "rocket-2.webp"]
     (شغّل tools/optimize-images.sh لتحويل الصور وضغطها أولاً)
   ============================================================ */

window.CATALOGUE = [
  {
    group: "ورقيات وخس",
    items: [
      { id: "lettuce-strips", name: "خس شرحات",   pricePerKg: 1.20, packs: [1000], images: [] },
      { id: "lettuce-salad",  name: "خس سلطة",     pricePerKg: 1.20, packs: [1000], images: [] },
      { id: "iceberg",        name: "خس آيسبرغ",   unit: "piece", pricePerPiece: 0.65, images: [] },
      { id: "lollo-bionda",   name: "لولو بيندا",  pricePerKg: 5.50, packs: [100],  images: [] },
      { id: "lollo-rosso",    name: "لولو روسو",   pricePerKg: 5.50, packs: [100],  images: [] }
    ]
  },
  {
    group: "ملفوف",
    items: [
      { id: "cabbage-strips", name: "ملفوف شرحات", pricePerKg: 0.50, packs: [1000], images: [] },
      { id: "red-cabbage",    name: "ملفوف أحمر",  pricePerKg: 2.75, packs: [200],  images: [] }
    ]
  },
  {
    group: "بصل وجذور",
    items: [
      { id: "onion",  name: "بصل مقطّع",  pricePerKg: 1.30, packs: [500],       images: [] },
      { id: "carrot", name: "جزر شرحات",  pricePerKg: 2.00, packs: [200, 1000], images: [] }
    ]
  },
  {
    group: "أعشاب وورقيات",
    items: [
      { id: "basil",       name: "ريحان",         pricePerKg: 15.00, packs: [50],  images: [] },
      { id: "baby-leaves", name: "بيبي ليڤز",     pricePerKg: 11.25, packs: [200], images: [] },
      { id: "parsley",     name: "بقدونس مفروم",  pricePerKg: 2.00,  packs: [500], images: [] },
      { id: "rocket",      name: "جرجير",         pricePerKg: 4.50,  packs: [100],  images: [] },
      { id: "spinach",     name: "سبانخ",         pricePerKg: 3.00,  packs: [200], images: [] }
    ]
  },
  {
    group: "فلفل وبندورة وفطر",
    items: [
      { id: "sweet-pepper",  name: "فلفل حلو",     pricePerKg: 1.50, packs: [500],  images: [] },
      { id: "hot-pepper",    name: "فلفل حار",     pricePerKg: 1.20, packs: [500],  images: [] },
      { id: "tomato",        name: "بندورة",       pricePerKg: 0.65, packs: [1000], images: [] },
      { id: "cherry-tomato", name: "بندورة كرزية", pricePerKg: 2.00, packs: [250],  images: [] },
      { id: "mushroom",      name: "فطر مقطّع",    pricePerKg: 5.00, packs: [250],  images: [] }
    ]
  }
];

/* رقم الواتساب الذي تصل عليه الطلبات (بصيغة دولية بدون +) */
window.WHATSAPP_NUMBER = "962777717753";

/* مجلد صور المنتجات */
window.IMAGE_DIR = "assets/products/";

/* اجعلها true لإخفاء كبسة الصورة عن الأصناف التي لا صور لها بعد */
window.HIDE_EMPTY_IMAGE_BUTTONS = false;

/* ---------- دوال مساعدة مشتركة ---------- */

/** صيغة السعر: 1.2 → "1.20" */
window.money = function (n) {
  return n.toFixed(2);
};

/** اسم الكيس: 100 → "100g" ، 1000 → "1kg" */
window.packLabel = function (grams) {
  return grams < 1000 ? grams + "g" : grams / 1000 + "kg";
};

/** سعر كيس بوزن معيّن */
window.packPrice = function (item, grams) {
  return item.pricePerKg * grams / 1000;
};

/** كل أصناف الكتالوج في مصفوفة واحدة */
window.allItems = function () {
  return window.CATALOGUE.reduce(function (acc, g) {
    return acc.concat(g.items);
  }, []);
};
