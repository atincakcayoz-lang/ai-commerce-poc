import express from "express";
import cors from "cors";
import morgan from "morgan";
import { faker } from "@faker-js/faker";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Kategoriler
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

// 10.000 ürün üretelim
const products = Array.from({ length: 10000 }, (_, i) => {
  const category = faker.helpers.arrayElement(categories);
  const brand = faker.helpers.arrayElement(brands);
  const unit = faker.helpers.arrayElement(["adet", "kg", "lt", "paket", "kutu", "şişe"]);
  const price = faker.number.float({ min: 10, max: 500, precision: 0.01 });
  const image = faker.helpers.arrayElement([
    "https://images.unsplash.com/photo-1580915411954-282cb1c9c450?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1625944527940-ef7fc9f45ed7?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1565958011702-44e211172bff?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1604908177522-040dbb6de9ae?auto=format&fit=crop&w=800&q=80"
  ]);

  return {
    id: `PRD-${i + 1}`,
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
    image_url: image,
    stock: faker.number.int({ min: 0, max: 200 }),
    rating: faker.number.float({ min: 3, max: 5, precision: 0.1 }),
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

// health
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "✅ AI Commerce Market PoC running",
    products: products.length
  });
});

// ürün listeleme
app.get("/v2/products", (req, res) => {
  const rawQ = req.query.q || "";
  const q = rawQ.toLowerCase().trim();
  const limit = parseInt(req.query.limit || "12", 10);

  let results = products;

  if (q) {
    // basit normalizasyon
    const norm = q
      .replace("süt ürünleri", "süt")
      .replace("kahvaltı", "süt & kahvaltılık")
      .replace("kahvaltılık", "süt & kahvaltılık")
      .trim();

    results = products.filter((p) => {
      const title = p.title.toLowerCase();
      const cat = p.category.toLowerCase();
      const desc = p.description.toLowerCase();
      return (
        title.includes(norm) ||
        cat.includes(norm) ||
        desc.includes(norm)
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
  res.status(201).json({
    type: "cart",
    id: `CART-${Date.now()}`,
    items: [],
    total: {
      value: 0,
      currency: "TRY",
      formatted: "0 ₺"
    }
  });
});

// sepete ürün ekle
app.post("/v2/cart/:cartId/items", (req, res) => {
  const { product_id, quantity = 1 } = req.body || {};
  const { cartId } = req.params;

  const product = products.find((p) => p.id === product_id);
  if (!product) {
    return res.status(404).json({ error: "Ürün bulunamadı" });
  }

  const lineTotal = product.price.value * quantity;

  res.json({
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
  });
});

// checkout
app.post("/v2/checkout", (req, res) => {
  const { cart_id, payment_method = "credit_card" } = req.body || {};
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

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint bulunamadı" });
});

// listen
app.listen(PORT, () => {
  console.log(`✅ AI Commerce Market PoC running on port ${PORT}`);
});
