import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// ✅ CORS yapılandırması (OpenAI erişimi için)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Preflight OPTIONS isteği düzeltmesi
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.sendStatus(200);
});

// Mock data seti (10.000 ürün)
import { faker } from "@faker-js/faker";

const categories = [
  "Süt & Kahvaltılık",
  "Et & Tavuk & Balık",
  "Meyve & Sebze",
  "Atıştırmalık",
  "İçecek",
  "Temizlik",
  "Kişisel Bakım",
  "Ev Gereçleri",
  "Bebek Ürünleri",
  "Evcil Hayvan"
];

const brands = [
  "Sütaş", "Pınar", "Torku", "Ülker", "Eti", "Sana", "Komili", "Tat", "Dimes", "Migros"
];

const products = Array.from({ length: 10000 }, (_, i) => {
  const category = faker.helpers.arrayElement(categories);
  const brand = faker.helpers.arrayElement(brands);
  const id = `PRD-${i + 1}`;
  const price = Number((faker.number.float({ min: 10, max: 200 })).toFixed(2));
  const stock = faker.number.int({ min: 0, max: 150 });
  const rating = Number((faker.number.float({ min: 3, max: 5 })).toFixed(1));

  return {
    id,
    type: "product",
    title: `${brand} ${category} Ürünü ${i + 1}`,
    subtitle: brand,
    category,
    description: `${category} kategorisinde ${brand} markasına ait ürün. Birim: ${faker.helpers.arrayElement(["adet", "lt", "kg", "paket", "şişe", "kutu"])}.`,
    price: { value: price, currency: "TRY", formatted: `${price} ₺` },
    stock,
    image_url: faker.image.urlLoremFlickr({ category: "grocery" }),
    rating,
    actions: [
      {
        type: "add_to_cart",
        label: "Sepete ekle",
        product_id: id,
        quantity: 1,
      },
    ],
  };
});

// ✅ Ana endpoint — durum kontrolü
app.get("/", (req, res) => {
  res.json({ ok: true, message: "AI Commerce PoC is up", products: products.length });
});

// ✅ Ürün listeleme
app.get("/v2/products", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const limit = parseInt(req.query.limit) || 12;

  let filtered = products;
  if (q) {
    filtered = products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q)
    );
  }

  const result = filtered.slice(0, limit);

  res.json({
    type: "product_list",
    total: filtered.length,
    count: result.length,
    items: result,
  });
});

// ✅ Kategori listesi
app.get("/v2/categories", (req, res) => {
  const items = categories.map((c, idx) => ({
    id: `CAT-${idx + 1}`,
    name: c,
    actions: [
      { type: "view_products", label: `${c} ürünlerini göster`, query: c },
    ],
  }));

  res.json({
    type: "category_list",
    count: items.length,
    items,
  });
});

// ✅ Yeni sepet oluştur
app.post("/v2/cart", (req, res) => {
  const cart = {
    type: "cart",
    id: `CART-${Date.now()}`,
    items: [],
    total: { value: 0, currency: "TRY", formatted: "0 ₺" },
  };
  res.status(201).json(cart);
});

// ✅ Sepete ürün ekle
app.post("/v2/cart/:cartId/items", (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  const product = products.find((p) => p.id === product_id);
  if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });

  const total = product.price.value * quantity;

  const cart = {
    type: "cart",
    id: req.params.cartId,
    items: [
      {
        product_id,
        title: product.title,
        image_url: product.image_url,
        quantity,
        line_total: {
          value: total,
          currency: "TRY",
          formatted: `${total.toFixed(2)} ₺`,
        },
      },
    ],
    total: {
      value: total,
      currency: "TRY",
      formatted: `${total.toFixed(2)} ₺`,
    },
  };

  res.json(cart);
});

// ✅ Checkout (ödeme)
app.post("/v2/checkout", (req, res) => {
  const { cart_id, payment_method = "credit_card" } = req.body;
  const order = {
    type: "order_confirmation",
    order_id: `ORD-${Date.now()}`,
    status: "confirmed",
    total: { value: 149.9, currency: "TRY", formatted: "149.90 ₺" },
    payment_method,
    delivery: { slot_id: "TODAY-18-20", address_id: "HOME" },
  };
  res.json(order);
});

// ✅ Plugin manifest ve OpenAPI dosyaları
app.get("/.well-known/ai-plugin.json", (req, res) => {
  res.sendFile(path.join(__dirname, ".well-known/ai-plugin.json"));
});

app.get("/v2-openapi.json", (req, res) => {
  res.sendFile(path.join(__dirname, "v2-openapi.json"));
});

// ✅ Basit yasal sayfalar
app.get("/privacy", (req, res) => {
  res.send("AI Commerce Market Gizlilik Politikası");
});
app.get("/terms", (req, res) => {
  res.send("AI Commerce Market Kullanım Şartları");
});
app.get("/legal", (req, res) => {
  res.send("AI Commerce Market Yasal Bilgilendirme");
});

// ✅ Sunucu başlat
app.listen(PORT, () => {
  console.log(`✅ AI Commerce Market PoC running on port ${PORT}`);
});
