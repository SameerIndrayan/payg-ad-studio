import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../db";

export const campaigns = Router();

// tiny mock pay() that writes a receipt
async function pay({
  campaignId,
  amountCents,
  memo,
  payload
}: {
  campaignId: string;
  amountCents: number;
  memo: "tool_call" | "asset_purchase" | "post";
  payload: unknown;
}) {
  const payloadHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

  return prisma.receipt.create({
    data: {
      campaignId,
      amountCents,
      currency: "USD",
      rail: "mock",
      memo,
      policyApplied: "dev-policy",
      payloadHash
    }
  });
}

// Create a campaign + generate a brief (counts as a paid tool call: $0.02)
campaigns.post("/", async (req, res) => {
  const { productId, goal, budget_cents } = req.body || {};
  if (!productId || !goal) {
    return res.status(400).json({ error: "productId and goal are required" });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: "product not found" });

  const campaign = await prisma.campaign.create({
    data: {
      productId,
      goal,
      budgetCents: Number(budget_cents || 0),
      status: "running"
    }
  });

  const brief = {
    tone: "friendly, concise",
    audience: "value-conscious shoppers",
    angles: [
      `Why ${product.title} is a steal today`,
      "Quick benefits",
      "Clear CTA"
    ]
  };

  const toolCall = await prisma.toolCall.create({
    data: {
      campaignId: campaign.id,
      tool: "caption",
      inputJson: JSON.stringify({ productId, goal }),
      outputJson: JSON.stringify({ brief }),
      utilityScore: 8,
      costCents: 2
    }
  });

  await pay({
    campaignId: campaign.id,
    amountCents: 2,
    memo: "tool_call",
    payload: { toolCallId: toolCall.id, tool: "caption" }
  });

  res.status(201).json({ campaign, brief });
});

// Simple ledger view
campaigns.get("/:id/ledger", async (req, res) => {
  const { id } = req.params;

  const [receipts, events] = await Promise.all([
    prisma.receipt.findMany({ where: { campaignId: id }, orderBy: { createdAt: "asc" } }),
    prisma.attributionEvent.findMany({ where: { campaignId: id }, orderBy: { occurredAt: "asc" } })
  ]);

  const totalCostCents = receipts.reduce((s, r) => s + r.amountCents, 0);
  const revenueCents = events
    .filter(e => e.type === "sale" && e.amountCents)
    .reduce((s, e) => s + (e.amountCents || 0), 0);

  res.json({ totalCostCents, revenueCents, receipts, events });
});
