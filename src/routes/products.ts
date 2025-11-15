import { Router } from "express";
import { prisma } from "../db";

export const products = Router();

// Create a product (we'll wire Shopify later)
products.post("/", async (req, res) => {
  const { title, description, imageUrl, priceCents, productUrl, tags } = req.body || {};
  if (!title) return res.status(400).json({ error: "title is required" });

  const p = await prisma.product.create({
    data: { title, description, imageUrl, priceCents, productUrl, tags },
  });
  res.status(201).json(p);
});

// List products
products.get("/", async (_req, res) => {
  const list = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  res.json(list);
});
