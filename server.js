import express from "express";
import cors from "cors";
import morgan from "morgan";
import { faker } from "@faker-js/faker";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Mock ürün listesi
const products = Array.from({ length: 30 }).map((_, i) => ({
  id: i + 1,
  name: `Ürün ${i + 1}`,
  category: i % 2 === 0 ? "Süt & Kahvaltılık" : "Atıştırmalık",
  price: (Math.random() * 100).toFixed(2),
  description: "Test ürünü açıklaması",
  image_url: "https://picsum.photos/200",
}));

app.get("/", (req, res) => {
  res.json({ message: "✅ API çalışıyor" });
});

app.get("/v2/products", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
  );
  res.json({ type: "product_list", count: filtered.length, items: filtered });
});

app.get("/v2/categories", (req, res) => {
  res.json({
    type: "category_list",
    items: [
      { id: 1, name: "Süt & Kahvaltılık" },
      { id: 2, name: "Atıştırmalık" },
      { id: 3, name: "İçecek" },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
