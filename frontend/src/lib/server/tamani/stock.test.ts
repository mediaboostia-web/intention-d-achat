import { describe, it, expect, vi } from 'vitest';
import { campaignStock } from './stock';

function db(campaign: unknown, orders: unknown[]) {
  const findUnique = vi.fn().mockResolvedValue(campaign);
  const findMany = vi.fn().mockResolvedValue(orders);
  return {
    db: { campaign: { findUnique }, saleOrder: { findMany } } as never,
    findUnique,
    findMany,
  };
}

describe('campaignStock', () => {
  it('reads only the paid orders that are not cancelled', async () => {
    const { db: d, findMany } = db(
      {
        availability: 'IN_STOCK',
        stockQuantity: 34,
        optionStock: [
          { option: 'Noir', count: 30 },
          { option: 'Rouge', count: 4 },
        ],
      },
      [
        { quantity: 4, optionQuantities: [{ option: 'Rouge', quantity: 4 }] },
        { quantity: 2, optionQuantities: null },
      ],
    );
    expect(await campaignStock(d, 'c1')).toEqual({ total: 28, byOption: { Noir: 30, Rouge: 0 } });
    expect(findMany).toHaveBeenCalledWith({
      where: { campaignId: 'c1', paid: true, status: { not: 'CANCELLED' } },
      select: { quantity: true, optionQuantities: true },
    });
  });

  it('has no cap on an incoming campaign', async () => {
    const { db: d, findMany } = db(
      { availability: 'INCOMING', stockQuantity: 10, optionStock: null },
      [],
    );
    expect(await campaignStock(d, 'c1')).toEqual({ total: null, byOption: null });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('has no cap when no stock was written', async () => {
    const { db: d } = db({ availability: 'IN_STOCK', stockQuantity: null, optionStock: null }, []);
    expect(await campaignStock(d, 'c1')).toEqual({ total: null, byOption: null });
  });
});
