import crypto from "crypto";
import { prisma } from "./db";

type Memo = "tool_call" | "asset_purchase" | "post";

const POLICY = {
  perCampaignCapCents: 500, // total budget per campaign
  perMemoCaps: {
    tool_call: 100,        // up to $1.00 on tool calls
    asset_purchase: 300,   // up to $3.00 on assets
    post: 50               // up to $0.50 on “posting”
  } as Record<Memo, number>
};

async function getTotals(campaignId: string) {
  const receipts = await prisma.receipt.findMany({ where: { campaignId } });
  const totalCents = receipts.reduce((s, r) => s + r.amountCents, 0);

  const byMemo: Record<Memo, number> = { tool_call: 0, asset_purchase: 0, post: 0 };
  for (const r of receipts) {
    const m = r.memo as Memo;
    if (m in byMemo) byMemo[m] += r.amountCents;
  }
  return { totalCents, byMemo };
}

export async function payWithPolicy(input: {
  campaignId: string;
  amountCents: number;
  memo: Memo;
  payload: unknown;
}) {
  const { campaignId, amountCents, memo, payload } = input;
  if (amountCents <= 0) {
    const err = new Error("amountCents must be > 0") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  const { totalCents, byMemo } = await getTotals(campaignId);

  // per-memo cap
  const nextMemoTotal = (byMemo[memo] || 0) + amountCents;
  if (nextMemoTotal > POLICY.perMemoCaps[memo]) {
    const err = new Error(
      `Policy block: ${memo} cap exceeded (${nextMemoTotal} > ${POLICY.perMemoCaps[memo]} cents)`
    ) as Error & { status?: number };
    err.status = 403;
    throw err;
  }

  // per-campaign cap
  const nextTotal = totalCents + amountCents;
  if (nextTotal > POLICY.perCampaignCapCents) {
    const err = new Error(
      `Policy block: campaign budget exceeded (${nextTotal} > ${POLICY.perCampaignCapCents} cents)`
    ) as Error & { status?: number };
    err.status = 403;
    throw err;
  }

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
      policyApplied: `caps: memo<=${POLICY.perMemoCaps[memo]}, total<=${POLICY.perCampaignCapCents}`,
      payloadHash
    }
  });
}

export async function getPolicyState(campaignId: string) {
  const { totalCents, byMemo } = await getTotals(campaignId);
  return {
    policy: POLICY,
    spend: { totalCents, byMemo }
  };
}


// Export the current policy for potential UI/debug use
export { POLICY };
