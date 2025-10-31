// server.js (ESM)

import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();
const PORT = process.env.PORT || 4000;

// ---- MIDDLEWARE ----
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(morgan("dev"));

// GPT bazen önce OPTIONS atıyor, hepsine 200 dönelim
app.options("*", (req, res) => {
  res.sendStatus(200);
});

// ---- SABİT VERİLER ----
const CATEGORIES = [
  "Süt & Kahvaltılık",
  "Et & Tavuk & Balık",
  "Sebze & Meyve",
  "Atıştırmalık",
  "İçecek",
  "Temel Gıda",
  "Kişisel Bakım",
  "Ev Bakım",
];

const BRANDS = ["Pınar", "Sütaş", "Torku", "Ülker", "Eti", "Tat", "Komili", "Migros"];

const IMAGE_POOL = [
  "https://images.unsplash.com/photo-1580915411954-282cb1c9c450?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1625944527940-ef7fc9f45ed7?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1565958011702-44e211172bff?auto=format&fit=crop&w=800&q=80",
];

// 10.000 ürünü AYNI PROCESS’TE, BAŞTA üret → istek sırasında bekleme yok
const PRODUCTS = Array.from({ length: 10000 }, (_, i) => {
  const cat = CATEGORIES[i % CATEGORIES.length];
  const brand = BRANDS[i % BRANDS.length];
  const price = 25 + (i % 120); // hızlı olsun
  return {
    id: `PRD-${i + 1}`,
    type: "product",
    title: `${brand} ${cat} Ürünü ${i + 1}`,
    subtitle: brand,
    category: cat,
    description: `${cat} kategorisinde ${brand} markalı ürün.`,
    price: {
      value: price,
      currency: "TRY",
      formatted: `${price.toFixed(2)} ₺`,
    },
    image_url: IMAGE_POOL[i % IMAGE_POOL.length],
    stock: 50 + (i % 50),
    rating: 4,
    actions: [
      {
        type: "add_to_cart",
        label: "Sepete ekle",
        product_id: `PRD-${i + 1}`,
        quantity: 1,
      },
    ],
  };
});

// ---- WELL-KNOWN ----
// plugin manifest
app.get("/.well-known/ai-plugin.json", (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json({
    schema_version: "v1",
    name_for_human: "AI Commerce Market",
    name_for_model: "ai_commerce_market",
    description_for_human:
      "Türkiye’deki market ürünlerini kendi API’nden listeleyen, sepete ekleyen ve ödeme adımına götüren akıllı market asistanı.",
    description_for_model:
      "Bu araç sadece https://ai-commerce-poc.onrender.com alan adındaki AI Commerce Market API’sini kullanır. Market ürünlerini aramak, kategori listelemek, sepete eklemek ve checkout yapmak için /v2/... endpoint’lerini çağır.",
    auth: { type: "none" },
    api: {
      type: "openapi",
      url: "https://ai-commerce-poc.onrender.com/v2-openapi.json",
      is_user_authenticated: false,
    },
    logo_url: "https://picsum.photos/seed/ai-commerce-logo/256/256",
    contact_email: "support@example.com",
    legal_info_url: "https://ai-commerce-poc.onrender.com/legal",
    terms_of_service_url: "https://ai-commerce-poc.onrender.com/terms",
    privacy_policy_url: "https://ai-commerce-poc.onrender.com/privacy",
  });
});

// openapi dosyası
app.get("/v2-openapi.json", (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json({
    openapi: "3.1.0",
    info: {
      title: "AI Commerce Market API",
      version: "2.0.0",
      description:
        "Bu API Türkiye’deki market ürünlerini listeler, sepete ekler ve checkout yapar. ChatGPT bu API dışındaki kaynaklardan ürün getirmemelidir.",
    },
    servers: [
      {
        url: "https://ai-commerce-poc.onrender.com",
        description: "Render production",
      },
    ],
    paths: {
      "/v2/products": {
        get: {
          operationId: "listProducts",
          summary: "Ürünleri listele",
          parameters: [
            {
              name: "q",
              in: "query",
              schema: { type: "string" },
              description: "Arama kelimesi veya kategori",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 12 },
              description: "Kaç ürün getirileceği",
            },
          ],
          responses: {
            200: {
              description: "Ürün listesi",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ProductList" },
                },
              },
            },
          },
        },
      },
      "/v2/categories": {
        get: {
          operationId: "listCategories",
          summary: "Kategorileri listele",
          responses: {
            200: {
              description: "Kategori listesi",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CategoryList" },
                },
              },
            },
          },
        },
      },
      "/v2/cart": {
        post: {
          operationId: "createCart",
          summary: "Sepet oluştur",
          responses: {
            201: {
              description: "Oluşturulan sepet",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Cart" },
                },
              },
            },
          },
        },
      },
      "/v2/cart/{cartId}/items": {
        post: {
          operationId: "addToCart",
          summary: "Sepete ürün ekle",
          parameters: [
            {
              name: "cartId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    product_id: { type: "string" },
                    quantity: { type: "integer", default: 1 },
                  },
                  required: ["product_id"],
                },
              },
            },
          },
          responses: {
            200: {
              description: "Güncel sepet",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Cart" },
                },
              },
            },
          },
        },
      },
      "/v2/checkout": {
        post: {
          operationId: "checkout",
          summary: "Ödemeyi tamamla",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    cart_id: { type: "string" },
                    payment_method: { type: "string" },
                  },
                  required: ["cart_id"],
                },
              },
            },
          },
          responses: {
            200: {
              description: "Sipariş onayı",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/OrderConfirmation" },
                },
              },
            },
          },
        },
      },
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
              items: { $ref: "#/components/schemas/ProductCard" },
            },
          },
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
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  label: { type: "string" },
                  product_id: { type: "string" },
                  quantity: { type: "integer" },
                },
              },
            },
          },
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
                },
              },
            },
          },
        },
        Cart: {
          type: "object",
          properties: {
            type: { type: "string", example: "cart" },
            id: { type: "string" },
            items: {
              type: "array",
              items: { type: "object" },
            },
            total: { $ref: "#/components/schemas/Price" },
          },
        },
        OrderConfirmation: {
          type: "object",
          properties: {
            type: { type: "string", example: "order_confirmation" },
            order_id: { type: "string" },
            status: { type: "string" },
            total: { $ref: "#/components/schemas/Price" },
          },
        },
        Price: {
          type: "object",
          properties: {
            value: { type: "number" },
            currency: { type: "string" },
            formatted: { type: "string" },
          },
        },
      },
    },
  });
});

// basit legal endpointleri
app.get("/legal", (req, res) => res.send("AI Commerce PoC Legal"));
app.get("/terms", (req, res) => res.send("AI Commerce PoC Terms"));
app.get("/privacy", (req, res) => res.send("AI Commerce PoC Privacy"));

// ---- ASIL ENDPOINTLER ----

// ürünler
app.get("/v2/products", (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  const limit = parseInt(req.query.limit || "12", 10);

  let results = PRODUCTS;
  if (q) {
    results = PRODUCTS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  const items = results.slice(0, limit);
  res.json({
    type: "product_list",
    total: results.length,
    count: items.length,
    items,
  });
});

// kategoriler
app.get("/v2/categories", (req, res) => {
  const items = CATEGORIES.map((c, i) => ({
    id: `CAT-${i + 1}`,
    name: c,
  }));
  res.json({
    type: "category_list",
    count: items.length,
    items,
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log("✅ AI Commerce PoC up on port", PORT);
});
