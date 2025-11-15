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

// ---- Import from Shopify Storefront: POST /products/import/shopify
products.post("/import/shopify", async (req, res) => {
  const url = process.env.SHOPIFY_STOREFRONT_URL;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  const limit = Number((req.body && req.body.limit) || 10);

  if (!url || !token) {
    return res.status(400).json({ error: "Missing SHOPIFY_STOREFRONT_URL or SHOPIFY_STOREFRONT_TOKEN env vars" });
  }

  const query = `
    query Products($first: Int!) {
      products(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            description
            onlineStoreUrl
            images(first: 1) { edges { node { url } } }
            variants(first: 1) { edges { node { price { amount } } } }
            tags
          }
        }
      }
    }
  `;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token
      },
      body: JSON.stringify({ query, variables: { first: limit } })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: "Shopify fetch failed", details: text });
    }

    const data = await resp.json();
    const edges = data?.data?.products?.edges || [];

    const created = [];
    for (const e of edges) {
      const n = e.node;
      const imageUrl = n.images?.edges?.[0]?.node?.url || null;
      const priceStr = n.variants?.edges?.[0]?.node?.price?.amount || null;
      const priceCents = priceStr ? Math.round(parseFloat(priceStr) * 100) : null;
      const tags = Array.isArray(n.tags) && n.tags.length ? n.tags.join(",") : null;

      const p = await prisma.product.create({
        data: {
          source: "shopify",
          sourceId: n.id,
          title: n.title,
          description: n.description || null,
          imageUrl,
          priceCents,
          productUrl: n.onlineStoreUrl || null,
          tags
        }
      });
      created.push(p);
    }

    res.status(201).json({ count: created.length, products: created });
  } catch (err: any) {
    res.status(500).json({ error: "Import error", message: err?.message || String(err) });
  }
});
