import "dotenv/config";
import express from "express";
import { products } from "./routes/products";
import { campaigns } from "./routes/campaigns";
import { events } from "./routes/events"; // ← add this

const app = express();
app.use(express.json());

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "payg-ad-studio" });
});

app.use("/products", products);
app.use("/campaigns", campaigns);
app.use("/events", events); // ← add this

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

// after all routes in src/index.ts (or wherever you mount routers)
app.use((err: any, _req, res, _next) => {
  const status = err?.status ?? 500;
  res.status(status).json({ error: err?.message ?? "Internal Server Error" });
});

