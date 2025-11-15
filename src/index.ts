import "dotenv/config";
import express from "express";
import { products } from "./routes/products";
import { campaigns } from "./routes/campaigns";
import { events } from "./routes/events"; 
import cors from "cors";
import { prisma } from './db';


const app = express();
app.use(express.json());

app.post('/products/import', async (_req, res) => {
  res.status(201).json({ ok: true, inserted: 0, updated: 0 });
});

app.use(cors({
  origin: true,           
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600
}));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "payg-ad-studio" });
});

app.use("/products", products);
app.use("/campaigns", campaigns);
app.use("/events", events); 

const PORT = Number(process.env.PORT || 3000);
 // adjust path if your prisma export is elsewhere

// ...

// Minimal import endpoint so the dashboard button works.
// Replace the middle section with your real Shopify importer later.
app.post('/products/import', async (req, res, next) => {
  try {
    const before = await prisma.product.count();

    // TODO: plug in your real importer here
    // await importFromShopify();

    const after = await prisma.product.count();
    res.status(201).json({
      ok: true,
      inserted: Math.max(0, after - before),
      updated: 0,
    });
  } catch (err) {
    next(err);
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

// after all routes in src/index.ts (or wherever you mount routers)
app.use((err: any, _req, res, _next) => {
  const status = err?.status ?? 500;
  res.status(status).json({ error: err?.message ?? "Internal Server Error" });
});


// Global JSON error handler (must be after all routes)
app.use((err: any, _req, res, _next) => {
  const status = typeof err?.status === "number" ? err.status : 500;
  const msg = err?.message || "Internal Server Error";
  // Optional: log stack for dev
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({ error: msg });
});


