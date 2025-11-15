import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../db";
import { payWithPolicy, getPolicyState, POLICY } from "../policy";
export const campaigns = Router();


const asyncH =
  <T extends (...args: any[]) => Promise<any>>(fn: T) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

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

  // record a 2¢ spend for initial brief generation
  await pay({
    campaignId: campaign.id,
    amountCents: 2,
    memo: "tool_call",
    payload: { toolCallId: toolCall.id, tool: "campaign_brief" }
  });

  res.status(201).json({ campaign, brief });
});

campaigns.get("/:id/policy", asyncH(async (req, res) => {
  const { id } = req.params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return res.status(404).json({ error: "campaign not found" });

  const state = await getPolicyState(id);
  // You can include budgetCents if you want it in the panel
  res.json({
    campaign: { id: campaign.id, budgetCents: campaign.budgetCents },
    ...state
  });
}));

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

// ---- Mock asset purchase: POST /campaigns/:id/assets
campaigns.post("/:id/assets", async (req, res, next) => {
  try {
    const campaignId = req.params.id;
    const { vendor = "mockstock", assetType = "image", priceCents } = req.body || {};

    if (!vendor || !assetType) {
      return res.status(400).json({ error: "vendor and assetType are required" });
    }
    const amount = Number(priceCents);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "priceCents must be a positive number" });
    }

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return res.status(404).json({ error: "campaign not found" });

    // record the tool call (selection/generation of asset)
    const toolCall = await prisma.toolCall.create({
      data: {
        campaignId: campaign.id,
        tool: "image_gen",
        inputJson: JSON.stringify({ vendor, assetType }),
        outputJson: JSON.stringify({ picked: `${vendor}/${assetType}` }),
        utilityScore: 7,
        costCents: 0 // tool step itself free; the "purchase" is the paid part
      }
    });

    // create the asset purchase row
    const asset = await prisma.assetPurchase.create({
      data: {
        campaignId: campaign.id,
        vendor,
        assetType,
        licenseRef: `LIC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        costCents: amount
      }
    });

    // write the receipt for the paid asset (policy-enforced)
    await payWithPolicy({
      campaignId: campaign.id,
      amountCents: amount,
      memo: "asset_purchase",
      payload: { toolCallId: toolCall.id, assetId: asset.id, vendor, assetType }
    });

    res.status(201).json({ asset, toolCall });
  } catch (err) {
    next(err);
  }
});

campaigns.post("/:id/captions", asyncH(async (req, res) => {
  const { id } = req.params;
  const { tone = "friendly", variations = 3 } = req.body || {};

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { product: true }
  });
  if (!campaign) return res.status(404).json({ error: "campaign not found" });

  const p = campaign.product;
  const opts = [
    `${p.title}: comfy, clean look. Grab it today.`,
    `Snug + simple. ${p.title} for everyday fits.`,
    `Your new go-to: ${p.title}. Soft. Solid. Done.`,
    `Level up basics with ${p.title}.`,
    `Keep it cozy with ${p.title}.`
  ].slice(0, Math.max(1, Math.min(variations, 5)));

  const toolCall = await prisma.toolCall.create({
    data: {
      campaignId: campaign.id,
      tool: "caption",
      inputJson: JSON.stringify({ tone, variations }),
      outputJson: JSON.stringify({ options: opts }),
      utilityScore: 8,
      costCents: 2
    }
  });

  // 2¢ via policy engine (will throw 403 if tool_call cap is exceeded)
  await payWithPolicy({
    campaignId: campaign.id,
    amountCents: 2,
    memo: "tool_call",
    payload: { toolCallId: toolCall.id, tone, variations }
  });

  res.status(201).json({ options: opts, toolCallId: toolCall.id });
})); 


// ---- Mock post: POST /campaigns/:id/post
campaigns.post("/:id/post", asyncH(async (req, res) => {
  const { id } = req.params;
  const { platform = "mock", caption, mediaUrl } = req.body || {};

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { product: true }
  });
  if (!campaign) return res.status(404).json({ error: "campaign not found" });

  const finalCaption =
    caption || `${campaign.product.title}: on sale today. Tap to learn more.`;

  const now = new Date();
  const post = await prisma.post.create({
    data: {
      campaignId: campaign.id,
      platform,
      caption: finalCaption,
      mediaUrl: mediaUrl || campaign.product.imageUrl || null,
      scheduledAt: now,
      postedAt: now,
      postUrl: `http://localhost:3000/mock-posts/${crypto
        .createHash("md5")
        .update(campaign.id + now.toISOString())
        .digest("hex")
        .slice(0, 10)}`
    }
  });

  // 1¢ “publish” via policy engine (blocks if post cap exceeded)
  await payWithPolicy({
    campaignId: campaign.id,
    amountCents: 1,
    memo: "post",
    payload: { postId: post.id, platform }
  });

  res.status(201).json({ post });
})); // note the closing '));'


// ---- Summary: GET /campaigns/:id/summary
campaigns.get("/:id/summary", async (req, res) => {
  const { id } = req.params;

  const [campaign, receipts, events, posts] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id },
      include: { product: true }
    }),
    prisma.receipt.findMany({ where: { campaignId: id } }),
    prisma.attributionEvent.findMany({ where: { campaignId: id } }),
    prisma.post.findMany({ where: { campaignId: id } })
  ]);

  if (!campaign) return res.status(404).json({ error: "campaign not found" });

  const totalCostCents = receipts.reduce((s, r) => s + r.amountCents, 0);
  const revenueCents = events
    .filter(e => e.type === "sale" && e.amountCents)
    .reduce((s, e) => s + (e.amountCents || 0), 0);

  const profitCents = (revenueCents || 0) - (totalCostCents || 0);
  const roi = totalCostCents > 0 ? revenueCents / totalCostCents : null;

  res.json({
    campaign: {
      id: campaign.id,
      goal: campaign.goal,
      status: campaign.status,
      budgetCents: campaign.budgetCents
    },
    product: {
      id: campaign.product.id,
      title: campaign.product.title,
      priceCents: campaign.product.priceCents,
      productUrl: campaign.product.productUrl
    },
    totals: {
      costCents: totalCostCents,
      revenueCents,
      profitCents,
      roi // e.g., 83.33 means 83.33x revenue per $1 cost
    },
    counts: {
      receipts: receipts.length,
      sales: events.filter(e => e.type === "sale").length,
      posts: posts.length
    }
  });
});
