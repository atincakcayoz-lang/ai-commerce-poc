// server.js (FINAL)
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// CORS + JSON
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  next();
});

/* ------------------ 1) TÜRKİYE'YE ÖZGÜ 10.000 ÜRÜN ------------------ */
function generateTurkishProducts() {
  const categories = [
    {
      code: "sut-kahvalti",
      name: "Süt & Kahvaltılık",
      price: [30, 160],
      img: "photo-1580915411954-282cb1c9c450"
    },
    {
      code: "et-tavuk",
      name: "Et & Tavuk",
      price: [190, 480],
      img: "photo-1604908176997-1251882baab4"
    },
    {
      code: "sebze",
      name: "Sebze",
      price: [15, 60],
      img: "photo-1540420773420-3366772f4999"
    },
    {
      code: "meyve",
      name: "Meyve",
      price: [15, 75],
      img: "photo-1517260739337-6799d239ce83"
    },
    {
      code: "icecek",
      name: "İçecek",
      price: [10, 50],
      img: "photo-1544145945-f90425340c7e"
    },
    {
      code: "atistirmalik",
      name: "Atıştırmalık",
      price: [12, 90],
      img: "photo-1542838132-de9d4df786e9"
    },
    {
      code: "temel-gida",
      name: "Temel Gıda",
      price: [25, 220],
      img: "photo-1586201375761-83865001e31b"
    },
    {
      code: "temizlik",
      name: "Temizlik & Deterjan",
      price: [35, 190],
      img: "photo-1581578731548-c64695cc6952"
    },
    {
      code: "kisisel-bakim",
      name: "Kişisel Bakım",
      price: [25, 280],
      img: "photo-1588776814546-ec7c9a92f8e3"
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
    if (PRODUCTS.length >= targetTotal) break;
  }
  return PRODUCTS;
}

const PRODUCTS = generateTurkishProducts();
console.log("🛒 Generated products:", PRODUCTS.length);

/* ------------------ 2) HEALTH + LEGAL ------------------ */
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "AI Commerce PoC is up",
    products: PRODUCTS.length,
    docs: "https://ai-commerce-poc.onrender.com/v2-openapi.json"
  });
});

app.get("/privacy", (req, res) => {
  res.type("text/plain").send("AI Commerce Market Privacy Policy (PoC).");
});
app.get("/terms", (req, res) => {
  res.type("text/plain").send("AI Commerce Market Terms of Service (PoC).");
});
app.get("/legal", (req, res) => {
  res.type("text/plain").send("AI Commerce Market Legal (PoC).");
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

// Yeni sepet
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

// Sepete ekle
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

// Checkout
app.post("/v2/checkout", (req, res) => {
  const { cart_id, address_id, slot_id, payment_method } = req.body;
  const cart = CARTS[cart_id];
  if (!cart) return res.status(404).json({ error: "cart not found" });

  const orderId = "ORD-" + Date.now();
  ORDERS[orderId] = {
    id: orderId,
    cart_id,
    total: cart.total,
    payment_method: payment_method || "credit_card",
    address_id: address_id || "EV",
    slot_id: slot_id || "TODAY-18-20"
  };

  res.json({
    type: "order_confirmation",
    order_id: orderId,
    status: "confirmed",
    total: { value: cart.total, currency: "TRY", formatted: `${cart.total} ₺` },
    delivery: {
      address_id: address_id || "EV",
      slot_id: slot_id || "TODAY-18-20"
    },
    payment_method: payment_method || "credit_card"
  });
});

/* ------------------ 5) OPENAPI + PLUGIN SERVE ------------------ */
app.get("/v2-openapi.json", (req, res) => {
  // burada direkt dosya değil inline JSON veriyoruz ki localhost kalıntısı olmasın
  res.json({
    openapi: "3.0.1",
    info: {
      title: "AI Commerce Market API",
      version: "2.0.0",
      description: "Türkiye market PoC. ChatGPT sadece bu API'yi kullanmalıdır."
    },
    servers: [
      {
        url: "https://ai-commerce-poc.onrender.com/",
        description: "Render production"
      }
    ],
    paths: {
      "/v2/products": {
        get: {
          summary: "Ürünleri listele (kart formatı)",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 12 } }
          ],
          responses: {
            200: {
              description: "Ürün listesi",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ProductList" }
                }
              }
            }
          }
        }
      },
      "/v2/products/{id}": {
        get: {
          summary: "Tek ürün detayı",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } }
          ],
          responses: {
            200: {
              description: "Ürün detayı",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ProductDetail" }
                }
              }
            },
            404: { description: "Bulunamadı" }
          }
        }
      },
      "/v2/categories": {
        get: {
          summary: "Kategorileri listele",
          responses: {
            200: {
              description: "Kategori listesi",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CategoryList" }
                }
              }
            }
          }
        }
      },
      "/v2/cart": {
        post: {
          summary: "Yeni sepet oluştur",
          responses: {
            201: {
              description: "Oluşturulan sepet",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Cart" }
                }
              }
            }
          }
        }
      },
      "/v2/cart/{cartId}/items": {
        post: {
          summary: "Sepete ürün ekle",
          parameters: [
            { name: "cartId", in: "path", required: true, schema: { type: "string" } }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    product_id: { type: "string" },
                    quantity: { type: "integer", default: 1 }
                  },
                  required: ["product_id"]
                }
              }
            }
          },
          responses: {
            200: {
              description: "Güncel sepet",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Cart" }
                }
              }
            }
          }
        }
      },
      "/v2/checkout": {
        post: {
          summary: "Ödemeyi/siparişi tamamla",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    cart_id: { type: "string" },
                    address_id: { type: "string" },
                    slot_id: { type: "string" },
                    payment_method: { type: "string" }
                  },
                  required: ["cart_id"]
                }
              }
            }
          },
          responses: {
            200: {
              description: "Sipariş onayı",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OrderConfirmation" }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        ProductList: {
          type: "object",
          properties: {
            type: { type: "string", example: "product_list" },
            total: { type: "integer" },
            count: { type: "integer" },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/ProductCard" }
            }
          }
        },
        ProductCard: {
          type: "object",
          properties: {
            type: { type: "string", example: "product" },
            id: { type: "string" },
            title: { type: "string" },
            subtitle: { type: "string" },
            category: { type: "string" },
            description: { type: "string" },
            price: { $ref: "#/components/schemas/Price" },
            image_url: { type: "string" },
            stock: { type: "integer" },
            rating: { type: "number" },
            actions: { type: "array" }
          }
        },
        ProductDetail: {
          type: "object",
          properties: {
            type: { type: "string", example: "product_detail" },
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            image_url: { type: "string" },
            price: { $ref: "#/components/schemas/Price" },
            stock: { type: "integer" },
            rating: { type: "number" },
            brand: { type: "string" },
            actions: { type: "array" }
          }
        },
        CategoryList: {
          type: "object",
          properties: {
            type: { type: "string", example: "category_list" },
            count: { type: "integer" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  actions: { type: "array" }
                }
              }
            }
          }
        },
        Cart: {
          type: "object",
          properties: {
            type: { type: "string", example: "cart" },
            id: { type: "string" },
            items: { type: "array" },
            total: { $ref: "#/components/schemas/Price" }
          }
        },
        OrderConfirmation: {
          type: "object",
          properties: {
            type: { type: "string", example: "order_confirmation" },
            order_id: { type: "string" },
            status: { type: "string" },
            total: { $ref: "#/components/schemas/Price" },
            delivery: {
              type: "object",
              properties: {
                address_id: { type: "string" },
                slot_id: { type: "string" }
              }
            },
            payment_method: { type: "string" }
          }
        },
        Price: {
          type: "object",
          properties: {
            value: { type: "number" },
            currency: { type: "string" },
            formatted: { type: "string" }
          }
        }
      }
    }
  });
});

app.get("/.well-known/ai-plugin.json", (req, res) => {
  res.json({
    schema_version: "v1",
    name_for_human: "AI Commerce Market",
    name_for_model: "ai_commerce_market",
    description_for_human:
      "Türkiye’deki market ürünlerini kendi API’nden listeleyen, sepete ekleyen ve ödeme adımına götüren akıllı market asistanı.",
    description_for_model:
      "Bu araç sadece https://ai-commerce-poc.onrender.com/ alan adındaki AI Commerce Market API’sini kullanır. /v2/... endpoint’lerini çağır.",
    auth: { type: "none" },
    api: {
      type: "openapi",
      url: "https://ai-commerce-poc.onrender.com/v2-openapi.json",
      is_user_authenticated: false
    },
    logo_url: "https://picsum.photos/seed/ai-commerce-logo/256/256",
    contact_email: "support@example.com",
    legal_info_url: "https://ai-commerce-poc.onrender.com/legal",
    terms_of_service_url: "https://ai-commerce-poc.onrender.com/terms",
    privacy_policy_url: "https://ai-commerce-poc.onrender.com/privacy"
  });
});

/* ------------------ START ------------------ */
app.listen(PORT, () => {
  console.log(`🚀 AI Commerce PoC listening on http://0.0.0.0:${PORT}`);
});
