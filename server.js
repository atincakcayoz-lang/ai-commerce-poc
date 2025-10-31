const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

/* ------------------ 1) TÜRKİYE'YE ÖZGÜ 10.000 ÜRÜN ------------------ */
function generateTurkishProducts() {
  const categories = [
    {
      code: "sut-kahvalti",
      name: "Süt & Kahvaltılık",
      price: [30, 160],
      img: "photo-1580915411954-282cb1c9c450" // süt şişesi
    },
    {
      code: "et-tavuk",
      name: "Et & Tavuk",
      price: [190, 480],
      img: "photo-1604908176997-1251882baab4" // kırmızı et
    },
    {
      code: "sebze",
      name: "Sebze",
      price: [15, 60],
      img: "photo-1540420773420-3366772f4999" // sebzeler
    },
    {
      code: "meyve",
      name: "Meyve",
      price: [15, 75],
      img: "photo-1517260739337-6799d239ce83" // meyveler
    },
    {
      code: "icecek",
      name: "İçecek",
      price: [10, 50],
      img: "photo-1544145945-f90425340c7e" // içecekler
    },
    {
      code: "atistirmalik",
      name: "Atıştırmalık",
      price: [12, 90],
      img: "photo-1542838132-de9d4df786e9" // çerez
    },
    {
      code: "temel-gida",
      name: "Temel Gıda",
      price: [25, 220],
      img: "photo-1586201375761-83865001e31b" // makarna, yağ
    },
    {
      code: "temizlik",
      name: "Temizlik & Deterjan",
      price: [35, 190],
      img: "photo-1581578731548-c64695cc6952" // temizlik ürünleri
    },
    {
      code: "kisisel-bakim",
      name: "Kişisel Bakım",
      price: [25, 280],
      img: "photo-1588776814546-ec7c9a92f8e3" // kozmetik
    }
  ];

  const brands = [
    "Sütaş",
    "Pınar",
    "Torku",
    "Ülker",
    "Eti",
    "Tat",
    "Yudum",
    "Komili",
    "Erikli",
    "Fairy",
    "Domestos",
    "ABC"
  ];

  const units = ["adet", "kg", "lt", "paket", "kutu", "şişe"];
  const PRODUCTS = [];

  const targetTotal = 10000;
  const perCategory = Math.ceil(targetTotal / categories.length);
  let id = 1;

  for (const cat of categories) {
    for (let i = 0; i < perCategory; i++) {
      const price = +(
        cat.price[0] + Math.random() * (cat.price[1] - cat.price[0])
      ).toFixed(2);
      const brand = brands[Math.floor(Math.random() * brands.length)];
      const unit = units[Math.floor(Math.random() * units.length)];
      const stock = Math.floor(Math.random() * 120) + 5;
      const image_url = `https://images.unsplash.com/${cat.img}?auto=format&fit=crop&w=600&q=80`;

      PRODUCTS.push({
        id: `PRD-${id}`,
        sku: `SKU-${cat.code}-${id}`,
        name: `${brand} ${cat.name} Ürünü ${i + 1}`,
        brand,
        category: cat.name,
        category_code: cat.code,
        description: `${cat.name} kategorisinde ${brand} markasına ait ürün. Birim: ${unit}.`,
        price,
        currency: "TRY",
        unit,
        image_url,
        stock,
        tags: [cat.code, brand.toLowerCase(), unit],
        isPopular: Math.random() > 0.85,
        rating: +(3 + Math.random() * 2).toFixed(1)
      });

      id++;
      if (PRODUCTS.length >= targetTotal) break;
    }
  }
  return PRODUCTS;
}

const PRODUCTS = generateTurkishProducts();
console.log("🛒 Generated products:", PRODUCTS.length);

/* ------------------ 2) HEALTHCHECK ------------------ */
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "AI Commerce PoC is up",
    products: PRODUCTS.length
  });
});

/* ------------------ 2.1) LEGAL (GPT için şart) ------------------ */
app.get("/legal", (req, res) => {
  res.send("AI Commerce Market - Privacy & Terms - Bu PoC kullanıcı verisini kalıcı saklamaz.");
});

/* ------------------ 3) V1: Ham Ürün Listesi ------------------ */
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
  const items = filtered.slice(start, start + limit);

  res.json({ page, limit, total, items });
});

/* ------------------ 4) V2: UI-Friendly Endpoints ------------------ */
const CARTS = {};
const ORDERS = {};

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

/* --- 4.1 Tek ürün detayı --- */
app.get("/v2/products/:id", (req, res) => {
  const product = PRODUCTS.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json({
    type: "product_detail",
    id: product.id,
    title: product.name,
    description: product.description,
    image_url: product.image_url,
    price: { value: product.price, currency: "TRY", formatted: `${product.price} ₺` },
    stock: product.stock,
    rating: product.rating,
    brand: product.brand,
    actions: [{ type: "add_to_cart", label: "Sepete ekle", product_id: product.id, quantity: 1 }]
  });
});

/* --- 4.2 Kategoriler --- */
app.get("/v2/categories", (req, res) => {
  const categories = [...new Set(PRODUCTS.map((p) => p.category))];
  res.json({
    type: "category_list",
    count: categories.length,
    items: categories.map((c, i) => ({
      id: `CAT-${i + 1}`,
      name: c,
      actions: [{ type: "view_products", label: `${c} ürünlerini göster`, query: c }]
    }))
  });
});

/* ------------------ CART & CHECKOUT ------------------ */
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

/* ------------------ 5) STATIC OPENAPI & PLUGIN ------------------ */
app.use("/.well-known", express.static(path.join(__dirname, ".well-known")));
app.get("/v2-openapi.json", (req, res) => {
  res.sendFile(path.join(__dirname, "v2-openapi.json"));
});

/* ------------------ 6) LISTEN ------------------ */
app.listen(PORT, () => {
  const baseURL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  console.log(`🚀 AI Commerce PoC running at: ${baseURL}`);
});

app.get("/terms", (req, res) => {
  res.send("AI Commerce Market – Terms of Service: Bu PoC kapsamında kullanıcıya hizmet verilir, siparişler simülasyondur.");
});
