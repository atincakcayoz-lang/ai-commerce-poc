// server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

/* ------------------ 1) 10.000 ÜRÜN ------------------ */
function generateProducts10k() {
  const categories = [
    { code: "sut-kahvalti", name: "Süt & Kahvaltılık", price: [25, 120] },
    { code: "et-tavuk", name: "Et & Tavuk", price: [160, 480] },
    { code: "sebze", name: "Sebze", price: [12, 55] },
    { code: "meyve", name: "Meyve", price: [15, 75] },
    { code: "kuruyemis", name: "Kuruyemiş", price: [60, 210] },
    { code: "icecek", name: "İçecek", price: [9, 45] },
    { code: "temizlik", name: "Temizlik", price: [35, 190] },
    { code: "kisisel-bakim", name: "Kişisel Bakım", price: [25, 280] },
    { code: "makarna-bakliyat", name: "Makarna & Bakliyat", price: [15, 65] },
    { code: "un-seker-yag", name: "Un Şeker Yağ", price: [30, 210] },
    { code: "dondurulmus", name: "Dondurulmuş", price: [30, 120] },
    { code: "evcil-hayvan", name: "Evcil Hayvan", price: [40, 240] },
    { code: "bebek", name: "Bebek", price: [50, 360] },
    { code: "konsantre", name: "Konserve & Sos", price: [18, 95] },
    { code: "hazir-gida", name: "Hazır Gıda", price: [22, 110] },
    { code: "kahve-cay", name: "Kahve & Çay", price: [25, 250] },
    { code: "atistirmalik", name: "Atıştırmalık", price: [12, 80] },
    { code: "gurme", name: "Gurme & Şarküteri", price: [65, 320] },
    { code: "kagit-urunleri", name: "Kağıt Ürünleri", price: [25, 140] },
    { code: "kisisel-saglik", name: "Vitamin & Sağlık", price: [60, 380] }
  ];

  const products = [];
  const targetTotal = 10000;
  const perCategory = Math.ceil(targetTotal / categories.length);
  let globalId = 1;

  for (const cat of categories) {
    for (let i = 0; i < perCategory; i++) {
      const [minP, maxP] = cat.price;
      const price = +(minP + Math.random() * (maxP - minP)).toFixed(2);
      const stock = Math.floor(Math.random() * 120) + 5;

      const catImages = {
        "sut-kahvalti": [
          "https://images.unsplash.com/photo-1580915411954-282cb1c9c450",
          "https://images.unsplash.com/photo-1625944527940-ef7fc9f45ed7"
        ],
        "et-tavuk": [
          "https://images.unsplash.com/photo-1553163147-622ab57be1c7",
          "https://images.unsplash.com/photo-1604908176997-1251882baab4"
        ],
        "sebze": [
          "https://images.unsplash.com/photo-1540420773420-3366772f4999"
        ],
        "meyve": [
          "https://images.unsplash.com/photo-1517260739337-6799d239ce83"
        ],
        "kuruyemis": [
          "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad"
        ]
      };

      const fallback = `https://picsum.photos/seed/${cat.code}-${globalId}/600/400`;
      const baseImages = catImages[cat.code] || [fallback];
      const pickedImage = baseImages[Math.floor(Math.random() * baseImages.length)];

      const brands = ["Migros","M Life","Dimes","Pınar","Sütaş","Eti","Ülker","Torku","Tat","Sana","Uno","Sırma"];
      const brand = brands[Math.floor(Math.random() * brands.length)];

      const unitOptions = ["adet", "kg", "lt", "paket", "kutu", "şişe"];
      const unit = unitOptions[Math.floor(Math.random() * unitOptions.length)];

      products.push({
        id: `PRD-${globalId}`,
        sku: `SKU-${cat.code}-${globalId}`,
        name: `${cat.name} · ${brand} ${i + 1}`,
        brand,
        category: cat.name,
        category_code: cat.code,
        description: `${cat.name} kategorisinde, günlük siparişler için ürün. Birim: ${unit}.`,
        price,
        currency: "TRY",
        unit,
        image_url: pickedImage,
        stock,
        tags: [cat.code, brand.toLowerCase(), unit],
        isPopular: Math.random() > 0.85,
        rating: +(3 + Math.random() * 2).toFixed(1)
      });

      globalId++;
      if (products.length >= targetTotal) break;
    }
    if (products.length >= targetTotal) break;
  }

  // hala 10000 değilse doldur
  while (products.length < targetTotal) {
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const [minP, maxP] = cat.price;
    const price = +(minP + Math.random() * (maxP - minP)).toFixed(2);
    const idx = products.length + 1;
    products.push({
      id: `PRD-${idx}`,
      sku: `SKU-${cat.code}-${idx}`,
      name: `${cat.name} · Extra ${idx}`,
      brand: "Migros",
      category: cat.name,
      category_code: cat.code,
      description: `${cat.name} kategorisinde ek ürün.`,
      price,
      currency: "TRY",
      unit: "adet",
      image_url: `https://picsum.photos/seed/extra-${idx}/600/400`,
      stock: Math.floor(Math.random() * 100) + 1,
      tags: [cat.code],
      isPopular: false,
      rating: 4.1
    });
  }

  return products;
}

const PRODUCTS = generateProducts10k();
console.log("🛒 Generated products:", PRODUCTS.length);

/* ------------------ 2) HEALTHCHECK ------------------ */
app.get("/", (req, res) => {
  res.json({ ok: true, message: "AI Commerce PoC is up", products: PRODUCTS.length });
});

/* ------------------ 3) V1: ham ürün listesi ------------------ */
app.get("/v1/products", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const page = parseInt(req.query.page || "1", 10);
  const limit = parseInt(req.query.limit || "20", 10);

  let filtered = PRODUCTS;
  if (q) {
    filtered = PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const items = filtered.slice(start, end);

  res.json({ page, limit, total, items });
});

/* ------------------ 4) V2: UI-friendly endpoints ------------------ */

// bellek içi sepetler
const CARTS = {};
const ORDERS = {};

// ürünler (kart formatı)
app.get("/v2/products", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const limit = parseInt(req.query.limit || "12", 10);

  let filtered = PRODUCTS;
  if (q) {
    filtered = PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
    );
  }

  const items = filtered.slice(0, limit).map((p) => ({
    type: "product",
    id: p.id,
    title: p.name,
    subtitle: p.brand,
    category: p.category,
    description: p.description,
    price: { value: p.price, currency: p.currency, formatted: `${p.price} ₺` },
    stock: p.stock,
    image_url: p.image_url,
    rating: p.rating,
    actions: [
      { type: "add_to_cart", label: "Sepete ekle", product_id: p.id, quantity: 1 }
    ]
  }));

  res.json({ type: "product_list", total: filtered.length, count: items.length, items });
});

// yeni sepet
app.post("/v2/cart", (req, res) => {
  const id = "CART-" + Date.now();
  CARTS[id] = { id, items: [], total: 0, currency: "TRY" };
  res.status(201).json({
    type: "cart",
    id,
    items: [],
    total: { value: 0, currency: "TRY", formatted: "0 ₺" }
  });
});

// sepete ürün ekle
app.post("/v2/cart/:cartId/items", (req, res) => {
  const cart = CARTS[req.params.cartId];
  if (!cart) return res.status(404).json({ error: "cart not found" });

  const { product_id, quantity } = req.body;
  const product = PRODUCTS.find((p) => p.id === product_id);
  if (!product) return res.status(404).json({ error: "product not found" });

  const qty = quantity || 1;
  const lineTotal = +(product.price * qty).toFixed(2);

  cart.items.push({
    product_id: product.id,
    title: product.name,
    image_url: product.image_url,
    quantity: qty,
    unit_price: product.price,
    line_total: lineTotal
  });

  cart.total = +(cart.total + lineTotal).toFixed(2);

  res.json({
    type: "cart",
    id: cart.id,
    items: cart.items.map((i) => ({
      product_id: i.product_id,
      title: i.title,
      image_url: i.image_url,
      quantity: i.quantity,
      line_total: { value: i.line_total, currency: "TRY", formatted: `${i.line_total} ₺` }
    })),
    total: { value: cart.total, currency: "TRY", formatted: `${cart.total} ₺` }
  });
});

// teslimat slotları
app.get("/v2/delivery_slots", (req, res) => {
  const addressId = req.query.address_id || "EV";
  res.json({
    type: "delivery_slots",
    address_id: addressId,
    slots: [
      { id: "slot-today-morning", label: "Bugün 10:00 - 12:00", fee: { value: 0, currency: "TRY", formatted: "Ücretsiz" } },
      { id: "slot-today-evening", label: "Bugün 18:00 - 20:00", fee: { value: 19.9, currency: "TRY", formatted: "19,9 ₺" } },
      { id: "slot-tomorrow", label: "Yarın 20:00 - 22:00", fee: { value: 0, currency: "TRY", formatted: "Ücretsiz" } }
    ]
  });
});

// checkout
app.post("/v2/checkout", (req, res) => {
  const { cart_id, address_id, slot_id, payment_method } = req.body;
  const cart = CARTS[cart_id];
  if (!cart) return res.status(400).json({ error: "cart not found" });

  const orderId = "ORDER-" + Date.now();
  ORDERS[orderId] = {
    id: orderId,
    cart_id,
    address_id,
    slot_id,
    payment_method,
    total: cart.total,
    status: "created"
  };

  res.json({
    type: "order_confirmation",
    order_id: orderId,
    status: "created",
    total: { value: cart.total, currency: "TRY", formatted: `${cart.total} ₺` },
    delivery: { address_id, slot_id },
    payment_method
  });
});

/* ------------------ 5) statik plugin / openapi ------------------ */
app.use("/.well-known", express.static(path.join(__dirname, ".well-known")));
app.get("/v2-openapi.json", (req, res) => {
  res.sendFile(path.join(__dirname, "v2-openapi.json"));
});

/* ------------------ 6) listen ------------------ */
app.listen(PORT, () => {
  console.log(`🚀 AI Commerce PoC running on http://localhost:${PORT}`);
});
