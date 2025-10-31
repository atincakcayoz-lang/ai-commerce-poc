import express from "express";
import cors from "cors";
import morgan from "morgan";
import { faker } from "@faker-js/faker";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// CORS & Preflight Middleware (Express 4 uyumlu)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Ana kontrol endpoint
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "✅ AI Commerce Market PoC running",
  });
});

// 10.000 ürün mock datası oluştur
const categories = [
  "Süt & Kahvaltılık",
  "Et & Tavuk & Balık",
  "Sebze & Meyve",
  "Atıştırmalık",
  "İçecek",
  "Temel Gıda",
  "Kişisel Bakım",
  "Ev Bakım",
  "Bebek Ürünleri",
  "Evcil Hayvan"
];

const brands = ["Pınar", "Torku", "Ülker", "Eti", "Tat", "Sütaş", "Sırma", "Komili", "Migros", "Dimes"];

const products = Array.from({ length: 10000 }, (_, i) => {
  const category = faker.helpers.arrayElement(categories);
  const brand = faker.helpers.arrayElement(brands);
  const image =
    faker.helpers.arrayElement([
      "https://images.unsplash.com/photo-1580915411954-282cb1c9c450",
      "https://images.unsplash.com/photo-1625944527940-ef7fc9f45ed7",
      "https://images.unsplash.com/photo-1565958011702-44e211172bff",
      "https://images.unsplash.com/photo-1604908177522-040dbb6de9ae"
    ]) + "?auto=format&fit=crop&w=600&q=80";

  return {
    id: `PRD-${i + 1}`,
    sku: `SKU-${category.toLowerCase().replace(/\s/g, "-")}-${i + 1}`,
    title: `${brand} ${category} Ürünü ${i + 1}`,
    subtitle: brand,
    category,
    description: `${category} kategorisinde ${brand} markasına ait ürün.`,
    price: {
      value: faker.number.float({ min: 10, max: 500, precision: 0.01 }),
      currency: "TRY",
      formatted: `${faker.number.float({ min: 10, max: 500, precision: 0.01 })} ₺`
    },
    stock: faker.number.int({ min: 0, max: 200 }),
    rating: faker.number.float({ min: 3, max: 5, precision: 0.1 }),
    image_url: image,
    actions: [
      {
        type: "add_to_cart",
        label: "Sepete ekle",
        product_id: `PRD-${i + 1}`,
        quantity: 1
      }
    ]
  };
});

// 🔹 Ürün Listeleme
app.get("/v2/products", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const limit = parseInt(req.query.limit) || 12;

  const filtered = q
    ? products.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    : products;

  res.json({
    type: "product_list",
    total: filtered.length,
    count: limit,
    items: filtered.slice(0, limit)
  });
});

// 🔹 Kategori Listeleme
app.get("/v2/categories", (req, res) => {
  const items = categories.map((c, i) => ({
    id: `CAT-${i + 1}`,
    name: c,
    actions: [
      {
        type: "list_products",
        label: `${c} ürünlerini listele`,
        category: c
      }
    ]
  }));

  res.json({
    type: "category_list",
    count: items.length,
    items
  });
});

// 🔹 Sepet Oluşturma
app.post("/v2/cart", (req, res) => {
  res.status(201).json({
    type: "cart",
    id: `CART-${Date.now()}`,
    items: [],
    total: { value: 0, currency: "TRY", formatted: "0 ₺" }
  });
});

// 🔹 Sepete Ürün Ekleme
app.post("/v2/cart/:cartId/items", (req, res) => {
  const { product_id, quantity } = req.body;
  const product = products.find((p) => p.id === product_id);
  if (!product)
    return res.status(404).json({ error: "Ürün bulunamadı" });

  const lineTotal = product.price.value * (quantity || 1);
  res.json({
    type: "cart",
    id: req.params.cartId,
    items: [
      {
        product_id: product.id,
        title: product.title,
        image_url: product.image_url,
        quantity,
        line_total: {
          value: lineTotal,
          currency: "TRY",
          formatted: `${lineTotal.toFixed(2)} ₺`
        }
      }
    ],
    total: {
      value: lineTotal,
      currency: "TRY",
      formatted: `${lineTotal.toFixed(2)} ₺`
    }
  });
});

// 🔹 Checkout (ödeme)
app.post("/v2/checkout", (req, res) => {
  const { cart_id, payment_method } = req.body;
  res.json({
    type: "order_confirmation",
    order_id: `ORD-${Date.now()}`,
    status: "onaylandı",
    total: { value: faker.number.float({ min: 50, max: 500 }), currency: "TRY" },
    payment_method: payment_method || "kredi kartı"
  });
});

// 🔹 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint bulunamadı" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`✅ AI Commerce Market PoC running on port ${PORT}`)
);
