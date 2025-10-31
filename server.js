const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { faker } = require("@faker-js/faker");

const app = express();
const PORT = process.env.PORT || 4000;

// temel middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// CORS preflight (Express 4 uyumlu)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// =========================
// MOCK VERİ KAYNAĞI
// =========================

// Türkiye market kategorileri
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

// Yerli / markette göreceğimiz markalar
const brands = [
  "Pınar",
  "Sütaş",
  "Torku",
  "Ülker",
  "Eti",
  "Tat",
  "Komili",
  "Migros",
  "Dimes",
  "Sırma"
];

// 10.000 ürüne kadar üretelim (çok büyük ise 2000'e indirebilirsin)
const products = Array.from({ length: 10000 }, (_, i) => {
  const category = faker.helpers.arrayElement(categories);
  const brand = faker.helpers.arrayElement(brands);
  const unit = faker.helpers.arrayElement(["adet", "kg", "lt", "paket", "kutu", "şişe"]);
  const price = faker.number.float({ min: 10, max: 500, precision: 0.01 });

  // görseli sabitleyelim ki GPT kart gösterdiğinde bozuk olmasın
  const image = faker.helpers.arrayElement([
    "https://images.unsplash.com/photo-1580915411954-282cb1c9c450?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1625944527940-ef7fc9f45ed7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1565958011702-44e211172bff?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1604908177522-040dbb6de9ae?auto=format&fit=crop&w=800&q=80"
  ]);

  return {
    id: `PRD-${i + 1}`,
    sku: `SKU-${category.toLowerCase().replace(/\s/g, "-")}-${i + 1}`,
    type: "product",
    title: `${brand} ${category} Ürünü ${i + 1}`,
    subtitle: brand,
    category,
    description: `${category} kategorisinde ${brand} markasına ait ${unit} bazlı market ürünü.`,
    price: {
      value: price,
      currency: "TRY",
      formatted: `${price.toFixed(2)} ₺`
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

// =========================
// ENDPOINTLER
// =========================

// healthcheck
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "✅ AI Commerce Market PoC running",
    products: products.length
  });
});

// ürün listeleme (gelişmiş arama)
app.get("/v2/products", (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  const limit = parseInt(req.query.limit || "12", 10);

  let results = products;

  if (q) {
    // küçük bir eş anlamlı / normalizasyon
    const normalized = q
      .replace("süt ürünleri", "süt")
      .replace("kahvaltılık", "süt & kahvaltılık")
      .replace("yoğurtlar", "yoğurt")
      .trim();

    results = products.filter((p) => {
      const title = p.title.toLowerCase();
      const cat = p.category.toLowerCase();
      const desc = p.description.toLowerCase();

      return (
        title.includes(normalized) ||
        cat.includes(normalized) ||
        desc.includes(normalized)
      );
    });
  }

  const items = results.slice(0, limit);

  res.json({
    type: "product_list",
    total: results.length,
    count: items.length,
    items
  });
});

// kategoriler
app.get("/v2/categories", (req, res) => {
  const items = categories.map((c, idx) => ({
    id: `CAT-${idx + 1}`,
    name: c,
    actions: [
      {
        type: "list_products",
        label: `${c} ürünlerini listele`,
        query: c
      }
    ]
  }));

  res.json({
    type: "category_list",
    count: items.length,
    items
  });
});

// sepet oluştur
app.post("/v2/cart", (req, res) => {
  const cart = {
    type: "cart",
    id: `CART-${Date.now()}`,
    items: [],
    total: { value: 0, currency: "TRY", formatted: "0 ₺" }
  };
  res.status(201).json(cart);
});

// sepete ürün ekle
app.post("/v2/cart/:cartId/items", (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  const { cartId } = req.params;

  const product = products.find((p) => p.id === product_id);
  if (!product) {
    return res.status(404).json({ error: "Ürün bulunamadı" });
  }

  const lineTotal = product.price.value * quantity;

  const cart = {
    type: "cart",
    id: cartId,
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
  };

  res.json(cart);
});

// checkout
app.post("/v2/checkout", (req, res) => {
  const { cart_id, payment_method = "credit_card" } = req.body;

  res.json({
    type: "order_confirmation",
    order_id: `ORD-${Date.now()}`,
    status: "confirmed",
    total: {
      value: 149.9,
      currency: "TRY",
      formatted: "149.90 ₺"
    },
    payment_method,
    delivery: {
      address_id: "HOME",
      slot_id: "TODAY-18-20"
    }
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint bulunamadı" });
});

// sunucu
app.listen(PORT, () => {
  console.log(`✅ AI Commerce Market PoC running on port ${PORT}`);
});
