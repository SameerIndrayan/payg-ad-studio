import { Router } from "express";
import { prisma } from "../db";

export const events = Router();

/**
 * Simulate an order being created (a sale) so the ledger shows revenue.
 * POST /events/order-created
 * body: { campaignId: string, saleCents: number, metadata?: object, occurredAt?: string ISO }
 */
events.post("/order-created", async (req, res) => {
  const { campaignId, saleCents, metadata, occurredAt } = req.body || {};

  if (!campaignId || typeof saleCents !== "number") {
    return res.status(400).json({ error: "campaignId and numeric saleCents are required" });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return res.status(404).json({ error: "campaign not found" });

  const evt = await prisma.attributionEvent.create({
    data: {
      campaignId,
      type: "sale",
      amountCents: saleCents,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date()
    }
  });

  res.status(201).json({ event: evt });
});
