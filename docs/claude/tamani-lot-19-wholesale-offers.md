# Lot 19 — wholesale offers, stock per option, shipping, unit dropdown

Porteur, 2026-11-18. Spec: `docs/superpowers/specs/2026-11-18-wholesale-offers-design.md`.

## Where things live

| Concern | File |
|---|---|
| Offer rules, freezing picks, totals, labels, the WhatsApp price line | `frontend/src/lib/tamani/offers.ts` |
| Stock left (declared − paid, non-cancelled orders; never below 0) | `frontend/src/lib/tamani/stock.ts`, `frontend/src/lib/server/tamani/stock.ts` |
| Product form offers editor | `frontend/src/components/app/OffersInput.tsx` |
| Counts per option in the campaign forms | `frontend/src/components/app/OptionStockFields.tsx` |
| Popup offers step, split step, shipping | `frontend/src/app/(public)/c/[code]/offer-picker.tsx`, `popup-sheet.tsx`, `lib/tamani/popup-machine.ts` |
| Server checks (reseller only, split = pieces, stock, shipping place) | `frontend/src/lib/server/tamani/responses.ts` |
| Orders priced from frozen picks | `frontend/src/lib/server/tamani/orders.ts` |

## Rules

- `Product.offers` is the source of truth. `wholesalePrice`/`wholesaleMinQty` mirror the first FROM offer (bridge) and are read only through `offersOf()` for rows saved before migration `9l`; drop them in a later lot.
- Picks are stored as frozen copies on `Response.offerPicks` and `SaleOrder.offerPicks`; `quantity` is always the total pieces.
- In stock, a client never asks more than what is left; « reste N » shows only when the shop shows its stock, « épuisé » always. The caps are in the public page data either way.
- `Response.fulfillment` (PICKUP | DELIVERY | SHIPPING) keeps `wantsDelivery` in sync; a shipping needs `deliveryPlace` (« Ville, Pays »).

## Not yet

- Manual order form: no pack picking, no shipping choice (the API accepts SHIPPING).
- Client page: picks not shown.
