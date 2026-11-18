// The stock left of a campaign in stock, read from its paid orders
// (lib/tamani/stock.ts). An incoming campaign has no cap.
import 'server-only';
import { optionSplit } from '@/lib/tamani/option-split';
import { optionStockLeft, readOptionStock, stockLeft } from '@/lib/tamani/stock';
import type { Db } from './locks';

export interface CampaignStock {
  /** Pieces left over the whole campaign; null: no cap. */
  total: number | null;
  /** Pieces left per option; null: no count per option. */
  byOption: Record<string, number> | null;
}

export const NO_CAP: CampaignStock = { total: null, byOption: null };

export async function campaignStock(db: Db, campaignId: string): Promise<CampaignStock> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { availability: true, stockQuantity: true, optionStock: true },
  });
  if (!campaign || campaign.availability !== 'IN_STOCK') return NO_CAP;
  const declared = readOptionStock(campaign.optionStock);
  const totalDeclared =
    campaign.stockQuantity ?? (declared ? declared.reduce((sum, d) => sum + d.count, 0) : null);
  if (totalDeclared === null && declared === null) return NO_CAP;
  const paid = await db.saleOrder.findMany({
    where: { campaignId, paid: true, status: { not: 'CANCELLED' } },
    select: { quantity: true, optionQuantities: true },
  });
  return {
    total: stockLeft(
      totalDeclared,
      paid.map((o) => o.quantity),
    ),
    byOption: declared
      ? optionStockLeft(
          declared,
          paid.map((o) =>
            optionSplit({
              option: null,
              quantity: o.quantity,
              optionQuantities: o.optionQuantities,
            }),
          ),
        )
      : null,
  };
}
