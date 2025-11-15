import "dotenv/config";
import express from "express";
import { products } from "./routes/products";
import { campaigns } from "./routes/campaigns";
import { events } from "./routes/events"; 
import cors from "cors";


const app = express();
app.use(express.json());

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


