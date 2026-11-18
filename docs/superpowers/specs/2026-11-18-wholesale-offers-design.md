# Wholesale offers, stock per option, shipping, unit picker — design

Date: 2026-11-18 · Branch: `plan/19-offres-gros` · Approved approach: A (porteur, 2026-11-18)

## Intent

Wholesalers already sell with several offers at once (porteur's example):

> 85 perruques à 350 000 FCFA · demi-lot 45 à 175 000 · 1 perruque = 10 000 FCFA, minimum 15 pièces

Tamani today allows one wholesale price per piece from one quantity. The porteur wants
the app to reflect how they work, "sans vraiment changer leur façon de travailler mais
simplifier". He also said a wholesaler ships, not only delivers, and that colours or
formats each have their own available quantity.

## Goals

1. **Unit picker.** The product's unit ("pièce", "carton"…) is a dropdown: the common
   units, then the shop's own, then « Personnalisé… », which reveals a text field.
2. **Many wholesale offers per product**, as many as the wholesaler wants (cap 10), of
   two kinds:
   - `FROM`: a price per piece from N pieces ("10 000 XAF l'unité dès 12");
   - `PACK`: a fixed price for a pack of N ("12 pour 26 000 XAF"), with an optional name
     ("Demi-lot", 30 chars).
3. **The respondent picks offers one or more times and mixes them**: 2 × pack of 12,
   15 pieces at the `FROM` price, 3 at the unit price (any quantity). The popup shows the
   running total in pieces and money.
4. **Stock per option.** On a product with options (one dimension: colour *or* format),
   the campaign holds a count per option when in stock. The respondent picks a count
   per option, never above it; an option at 0 shows « épuisé ». Incoming (« à
   commander ») campaigns have no cap per option; an optional planned count per option
   may be set.
5. **Shipping.** Besides pickup and delivery in the shop's zones, a campaign can offer
   « Expédition »: the respondent writes city and country. Fees are not computed; they
   are settled on WhatsApp.

## Non-goals

- Colour *and* size combined (the paused « couleur + taille » lot).
- Shipping fees, carriers, tracking.
- Cross-campaign sales statistics per offer (approach B).
- Onboarding simplification: a separate brainstorm follows this lot.

## Anti-goals

- A wholesaler who sells only at one price must not see more fields than today: offers
  stay folded behind « Je vends aussi en gros ».
- No promise of guaranteed sales in any copy; no invented prices in examples beyond the
  porteur's own.

## Constraints

- One Neon migration, applied only with the porteur's OK (rule since 2026-11-08).
- Existing products keep working: `wholesalePrice` + `wholesaleMinQty` become one `FROM`
  offer through the migration's SQL; old columns stay unread, dropped in a later lot.
- Existing answers and orders read as before (no composition = unit or old wholesale
  price × quantity).
- TDD, the usual gate, a recette on phone + computer before merge.

## Approaches

- **A — offers as JSON on the product, the picks as JSON on the answer and the order
  (chosen).** Same pattern as `Response.optionQuantities`, already proven. One
  migration. Trade-off: no easy SQL stats per offer across campaigns.
- **B — `ProductOffer` and order-line tables.** Easy stats, but the orders system is
  rebuilt: 2–3× longer and riskier before launch. Rejected.
- **C — keep one wholesale price, add one pack.** Fast, but not « autant qu'il veut ».
  Rejected.

## Design (decided with the porteur)

- Offers are shown to respondents who answer « pour revendre » (as today). « Pour toi »
  sees the unit price only.
- With options, the respondent first composes offers (total pieces), then splits that
  total across options; the split must add up to the total.
- Shipping is a third way next to pickup and delivery, chosen per campaign.

## Data (builder's detail, my calls)

- `Product.offers Json @default("[]")`: `[{ kind: 'FROM'|'PACK', qty: int ≥ 2, price:
  int, name?: string }]`. Rules: `FROM.price < unitPrice`; no two offers identical; ≤ 10.
  No per-piece rule on packs (a pack may carry packaging).
- `Response.offerPicks Json?` and `SaleOrder.offerPicks Json?`: `[{ offer: index |
  'UNIT', count }]` where `count` is packs for `PACK`, pieces for `FROM` (≥ its qty) and
  `UNIT`. `quantity` keeps the total pieces (the verdict and estimate read it).
  `SaleOrder.totalAmount` = sum of lines; `unitPrice` = rounded average, kept for old
  readers. The picks store a frozen copy of each offer's qty and price, so editing the
  product never changes an answer or an order.
- `Campaign.optionStock Json?`: `[{ option, count }]`. In stock: a hard cap per option.
  **Stock goes down each time a client pays** (porteur, 2026-11-18): remaining =
  the count the wholesaler wrote − the pieces of that option in the campaign's orders
  marked paid and not cancelled. Computed, not stored, so un-paying or cancelling gives
  the pieces back. Answers alone (intentions) do not lower it. The same rule applies to
  `Campaign.stockQuantity` on a product without options. `SaleOrder.optionQuantities
  Json?` keeps an order's split (copied from the answer, or set in the order form).
  Incoming: a planned count, no cap.
- `Campaign.shippingEnabled Boolean @default(false)`; `Response.fulfillment String?`
  (`PICKUP|DELIVERY|SHIPPING`) alongside `wantsDelivery` (kept in sync for old readers);
  `SaleOrder.fulfillment` accepts `SHIPPING`; the shipping place reuses
  `deliveryPlace` ("Ville, Pays").
- One pure module `lib/tamani/offers.ts` prices a composition (shared by the popup,
  the order form, the server and the stats), like `option-split.ts`.
- WhatsApp price line: unit price, then up to two offers, then « + N offres ».

## Left to the builder

Exact copy and layout of the offers editor and picker (mobile first, one-tap steppers),
the order form's offer picker for manual orders, how results/clients pages print a
composition (« 2 × Lot de 12, 15 à 10 000 »).
