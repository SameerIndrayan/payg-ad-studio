import "dotenv/config";
import express from "express";
import { products } from "./routes/products";
import { campaigns } from "./routes/campaigns";

const app = express();
app.use(express.json());

// health check
app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "payg-ad-studio" });
});

// routes
app.use("/products", products);
app.use("/campaigns", campaigns);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
