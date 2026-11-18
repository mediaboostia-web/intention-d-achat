# Wholesale offers, stock per option, shipping, unit picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A product carries many wholesale offers (price per piece from N, or a pack at a
fixed price); a reseller picks them one or more times; options have a stock that goes
down when a client pays; a campaign can offer shipping; the unit is a dropdown.

**Architecture:** Approach A of the spec: offers are JSON on `Product`, the picks are a
frozen JSON copy on `Response` and `SaleOrder` (same pattern as `optionQuantities`). Two
pure modules hold the rules (`lib/tamani/offers.ts`, `lib/tamani/stock.ts`), shared by
the popup, the forms, the server and the stats. One migration `9l_wholesale_offers`.

**Tech Stack:** Next.js 16, Prisma 5 (Neon), Zod, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-18-wholesale-offers-design.md`

## Global Constraints

- UI copy in French (tutoiement), code, comments and commits in English.
- Offers: at most 10 per product; `qty` int 2…100 000; `price` int 1…100 000 000;
  `name` ≤ 30 chars, optional, PACK only; `FROM.price < unitPrice`; no two offers with the
  same kind and qty.
- Offers are shown to and accepted from `RESELLER` answers only.
- Stock left = declared − pieces in the campaign's orders `paid = true` and
  `status != 'CANCELLED'`; never below 0; computed, never stored. Answers do not lower it.
- Incoming campaigns: no cap per option.
- Shipping: the respondent writes « Ville, Pays » (1…80 chars) in `deliveryPlace`; no fees.
- Existing rows read as before: no picks = unit price (or legacy wholesale) × quantity.
- The migration is applied to Neon only after the porteur's explicit OK. Never `seed:dev`.
- Gate before every commit: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`.
- Protected files (CLAUDE.md list) are not touched.

## Review Focus

1. A product saved before this lot (wholesalePrice 6 000 dès 12) opens with one FROM
   offer, prices its old answers and orders exactly as before. → Task 2 test
   `legacyOffers`, Task 7 test « an order without picks keeps unitPrice × quantity ».
2. The wholesaler deletes or edits an offer after answers came in: answers and orders keep
   their frozen picks and totals. → Task 2 test `freezePicks copies qty and price`,
   Task 6 test « a pick naming a missing offer index is a 400 ».
3. Two clients pay for the last 4 red wigs: the remaining shows 0, never −4, and the popup
   shows « épuisé ». → Task 4 test `optionStockLeft never negative`.
4. A reseller changes the offers after splitting colours: the split no longer matches the
   pieces and must be asked again, never saved mismatched. → Task 5 reducer test, Task 6
   server test « split total ≠ picks pieces is a 400 ».
5. A « pour toi » answer posts `offerPicks` by hand: refused. → Task 6 server test.

---

### Task 1: Unit picker with « Personnalisé… »

**Files:**
- Modify: `frontend/src/lib/tamani/units.ts`
- Modify: `frontend/src/components/app/ProductForm.tsx:167-199` (the chips block)
- Test: `frontend/src/lib/tamani/units.test.ts`, `frontend/src/components/app/product.test.tsx`

**Interfaces:**
- Produces: `CUSTOM_UNIT = '__custom__'`; `unitSelectValue(unit: string, choices: string[]): string`
  (the matching choice, case aside, else `CUSTOM_UNIT`).

- [ ] **Step 1: Failing tests.** `unitSelectValue('Carton', unitChoices([]))` → `'carton'`;
  `unitSelectValue('bassine', unitChoices([]))` → `CUSTOM_UNIT`. Component: the
  « Unité » field is a `combobox`; choosing « Personnalisé… » shows a text field
  labelled « Ton unité », typing « bassine » submits `unitLabel: 'bassine'`; an existing
  product with unit « bassine » opens with « Personnalisé… » selected and the text filled.
- [ ] **Step 2: Run** `pnpm --filter frontend exec vitest run src/lib/tamani/units.test.ts src/components/app/product.test.tsx` → FAIL.
- [ ] **Step 3: Implement.** Use the existing `Select` from `@/components/ui`; options are
  `unitChoices(units)` then `{ value: CUSTOM_UNIT, label: 'Personnalisé…' }`. The custom
  input keeps `maxLength={30}` and the field id `product-unit`.
- [ ] **Step 4: Run the same command** → PASS. Remove chip assertions the old tests made.
- [ ] **Step 5: Commit** `feat(product): the unit is a dropdown with a custom choice`.

### Task 2: The offers module

**Files:**
- Create: `frontend/src/lib/tamani/offers.ts`, `frontend/src/lib/tamani/offers.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type OfferKind = 'FROM' | 'PACK';
  export interface Offer { kind: OfferKind; qty: number; price: number; name: string | null }
  export const OFFERS_MAX = 10;
  /** What the popup and the order form send. */
  export interface PickInput { offer: number | 'UNIT'; count: number }
  /** What is stored: a frozen copy of the offer at the time of the pick. */
  export interface OfferPick { offer: number | 'UNIT'; kind: OfferKind | 'UNIT'; qty: number; price: number; name: string | null; count: number }
  export function legacyOffers(wholesalePrice: number | null, wholesaleMinQty: number | null): Offer[];
  export function readOffers(json: unknown): Offer[];            // tolerant reader: bad entries dropped
  export function readPicks(json: unknown): OfferPick[] | null;  // null: no picks stored
  export function offerViolation(offers: readonly Offer[], unitPrice: number): { index: number; message: string } | null;
  export function freezePicks(offers: readonly Offer[], unitPrice: number, picks: readonly PickInput[]): { ok: true; picks: OfferPick[] } | { ok: false; message: string };
  export function pickPieces(p: OfferPick): number;   // PACK: count × qty; FROM/UNIT: count
  export function pickAmount(p: OfferPick): number;   // PACK: count × price; FROM/UNIT: count × price
  export function picksTotal(picks: readonly OfferPick[]): { pieces: number; amount: number };
  export function offerLabel(o: Offer, unitLabel: string, currency: string): string;
  export function picksText(picks: readonly OfferPick[], unitLabel: string, currency: string): string;
  export function priceLine(unitPrice: number, offers: readonly Offer[], currency: string): string;
  export function lowestPiecePrice(unitPrice: number, offers: readonly Offer[]): number;
  ```

- [ ] **Step 1: Failing tests** (values from the porteur's example, XOF):
  - `legacyOffers(6000, 12)` → `[{ kind: 'FROM', qty: 12, price: 6000, name: null }]`; `legacyOffers(null, 12)` → `[]`.
  - `offerViolation([{kind:'FROM',qty:12,price:12000,name:null}], 10000)` → message
    « Le prix de gros doit être plus bas que le prix à l'unité. », index 0; two `PACK` of
    qty 12 → « Tu as déjà une offre pour 12. »; 11 offers → « 10 offres au plus. »;
    `PACK 85 / 350 000` with unit 10 000 → null.
  - `freezePicks(offers, 10000, [{offer:0,count:2},{offer:1,count:15},{offer:'UNIT',count:3}])`
    with offers `[PACK 12/26 000, FROM 12/10 000]` and unit 12 000 → picks totals
    `{ pieces: 42, amount: 238 000 }`; FROM count 11 → `ok:false` « À partir de 12 pour
    cette offre. »; offer index 5 → `ok:false`; the same offer twice → `ok:false`;
    count 0 → `ok:false`. Frozen picks keep `qty`/`price`/`name` of the offer.
  - `offerLabel(PACK 12/26 000)` → « Lot de 12 · 26 000 FCFA »; named « Demi-lot » 45/175 000
    → « Demi-lot (45) · 175 000 FCFA »; FROM 12/10 000 → « 10 000 FCFA l'unité dès 12 ».
  - `priceLine(12000, [3 offers], 'XOF')` → « 12 000 FCFA · Lot de 12 · 26 000 FCFA ·
    10 000 FCFA l'unité dès 12 · + 1 offre »; no offers → « 12 000 FCFA ».
  - `picksText` → « 2 × Lot de 12, 15 à 10 000 FCFA, 3 à l'unité ».
  - `lowestPiecePrice(12000, [PACK 12/26 000, FROM 12/10 000])` → 2 167 (rounded).
- [ ] **Step 2: Run** `pnpm --filter frontend exec vitest run src/lib/tamani/offers.test.ts` → FAIL.
- [ ] **Step 3: Implement** with `formatMoney` from `./currency`; `pluralizeUnit` for units
  where a label needs it. Pure, no server import.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(offers): pure rules for many wholesale offers`.

### Task 3: The migration `9l_wholesale_offers`

**Files:**
- Modify: `frontend/prisma/schema.prisma`
- Create: `frontend/prisma/migrations/9l_wholesale_offers/migration.sql`
- Test: `frontend/src/lib/server/tamani/schema-tamani.test.ts`

**Interfaces:**
- Produces columns: `Product.offers Json @default("[]")`; `Response.offerPicks Json?`;
  `Response.fulfillment String?`; `SaleOrder.offerPicks Json?`;
  `SaleOrder.optionQuantities Json?`; `Campaign.optionStock Json?`;
  `Campaign.shippingEnabled Boolean @default(false)`. `wholesalePrice`/`wholesaleMinQty`
  stay in the schema, unread by new code.

- [ ] **Step 1: Failing schema test** asserting the seven fields and the backfill SQL
  string `jsonb_build_array(jsonb_build_object('kind','FROM','qty',"wholesaleMinQty",'price',"wholesalePrice",'name',NULL))`
  guarded by `WHERE "wholesalePrice" IS NOT NULL AND "wholesaleMinQty" IS NOT NULL`.
- [ ] **Step 2: Run** the schema test → FAIL.
- [ ] **Step 3: Write** the schema and the SQL by hand (ALTER TABLE … ADD COLUMN, then the
  UPDATE backfill). Stop the dev server, then `pnpm --filter frontend exec prisma generate`.
  **Do not run `migrate deploy`**: ask the porteur first.
- [ ] **Step 4: Run** schema test + `pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(db): offers, picks, stock per option, shipping (migration 9l)`.

### Task 4: Stock left

**Files:**
- Create: `frontend/src/lib/tamani/stock.ts`, `frontend/src/lib/tamani/stock.test.ts`
- Create: `frontend/src/lib/server/tamani/stock.ts`, `frontend/src/lib/server/tamani/stock.test.ts`

**Interfaces:**
- Consumes: `OptionQuantity`, `optionSplit` from `lib/tamani/option-split.ts`.
- Produces:
  ```ts
  export interface OptionStock { option: string; count: number }
  export function readOptionStock(json: unknown): OptionStock[] | null;
  export function optionStockLeft(declared: readonly OptionStock[], paid: readonly OptionQuantity[][]): Record<string, number>;
  export function stockLeft(declared: number | null, paidQuantities: readonly number[]): number | null;
  // server
  export interface CampaignStock { total: number | null; byOption: Record<string, number> | null }
  export async function campaignStock(db: Db, campaignId: string): Promise<CampaignStock>; // IN_STOCK only, else both null
  ```

- [ ] **Step 1: Failing tests:** declared `[{Noir,30},{Rouge,4}]`, paid splits
  `[[{Rouge,3}],[{Rouge,2},{Noir,1}]]` → `{ Noir: 29, Rouge: 0 }` (never negative);
  `stockLeft(10, [3, 4])` → 3; `stockLeft(null, [3])` → null. Server (mocked Prisma like
  the neighbouring tests): only orders `paid: true, status: { not: 'CANCELLED' }` of that
  campaign are read; an INCOMING campaign → `{ total: null, byOption: null }`; an order
  without `optionQuantities` counts toward `total` only.
- [ ] **Step 2: Run** both files → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(stock): stock left goes down with paid orders`.

### Task 5: Product and campaign editing

**Files:**
- Modify: `frontend/src/lib/server/tamani/inputs.ts` (ProductFields, CampaignFields)
- Modify: `frontend/src/lib/tamani/product-rules.ts`, `product-form.ts`, `share-message.ts`
- Modify: `frontend/src/lib/server/tamani/serializers.ts` (toShopProduct, public campaign)
- Modify: `frontend/src/components/app/ProductForm.tsx`, `CampaignWizard.tsx`, `CampaignEditForm.tsx`
- Create: `frontend/src/components/app/OffersInput.tsx`
- Test: `product-form.test.ts`, `share-message.test.ts`, `product.test.tsx`, `campaign.test.tsx`, `app/api/shops/[orgId]/products/route.test.ts`, `…/campaigns/route.test.ts`

**Interfaces:**
- Consumes: Task 2 (`Offer`, `offerViolation`, `priceLine`, `OFFERS_MAX`), Task 4 (`OptionStock`).
- Produces: API product body `offers: Offer[]` (replaces `wholesalePrice`/`wholesaleMinQty`
  in requests and responses); campaign body `optionStock: OptionStock[] | null`,
  `shippingEnabled: boolean`; `ProductFormValues.offers: Array<{ kind: OfferKind; qty: string; price: string; name: string }>`.

- [ ] **Step 1: Failing tests:**
  - API: POST product with 2 offers → 201 and `offers` echoed; an offer FROM ≥ unit price
    → 400 `VALIDATION_FAILED`; 11 offers → 400.
  - `productFormToBody` maps typed rows « 26 000 » to 26000 and reports the error under
    `offers.<index>`; empty rows are dropped.
  - `formatPriceLine` is replaced by `priceLine` in the share message: « 12 000 FCFA ·
    Lot de 12 · 26 000 FCFA ».
  - ProductForm: switch « Je vends aussi en gros » shows one empty row with a kind toggle
    « Prix dès » / « Lot »; « Ajouter une offre » adds rows up to 10; the WhatsApp preview
    line follows.
  - Campaign wizard and edit form: on a product with options and « En stock », one count
    per option labelled with the option (« Noir — en stock »); at « À commander », the
    same fields are optional with the hint « Combien tu prévois de commander (facultatif) »;
    a switch « J'expédie aussi (autre ville, autre pays) » sets `shippingEnabled`.
  - Campaign API: `optionStock` naming an option the product does not have → 400.
- [ ] **Step 2: Run** the listed tests → FAIL.
- [ ] **Step 3: Implement.** `optionStock` replaces `stockQuantity` only on products with
  options (on others, `stockQuantity` stays as today). `productRuleViolation` keeps the
  option rules and delegates offers to `offerViolation`.
- [ ] **Step 4: Run** → PASS, then the full gate.
- [ ] **Step 5: Commit** `feat(product): many wholesale offers; campaign stock per option and shipping`.

### Task 6: The popup and the answer

**Files:**
- Modify: `frontend/src/lib/tamani/popup-machine.ts`, `popup-copy.ts`
- Modify: `frontend/src/app/(public)/c/[code]/popup-sheet.tsx`
- Create: `frontend/src/app/(public)/c/[code]/offer-picker.tsx`
- Modify: `frontend/src/lib/server/tamani/inputs.ts` (ResponseStep), `responses.ts`, `public-campaign.ts`
- Test: `popup-machine.test.ts`, `popup.test.tsx`, `responses` route tests

**Interfaces:**
- Consumes: Task 2 (`PickInput`, `freezePicks`, `picksTotal`, `offerLabel`), Task 4 (`campaignStock`).
- Produces: `PopupAnswers.offerPicks: PickInput[] | null`, `PopupAnswers.fulfillment:
  'PICKUP' | 'DELIVERY' | 'SHIPPING' | null`; action `{ type: 'offers'; picks: PickInput[]; pieces: number }`;
  `ResponseStepBody.offerPicks?: PickInput[]`, `ResponseStepBody.fulfillment?`;
  `PublicCampaign.product.offers: Offer[]`, `PublicCampaign.stock: CampaignStock`,
  `PublicCampaign.shippingEnabled: boolean`.

- [ ] **Step 1: Failing tests:**
  - Reducer: a RESELLER on a product with offers goes `buyer → offers → (options split if
    the product has options) → timing`; a CONSUMER keeps `buyer → quantity`; changing the
    picks after a split clears `optionQuantities`; a split step needs a total equal to the
    picks' pieces.
  - Popup: the offers screen lists « Lot de 12 · 26 000 FCFA » with a −/+ stepper, « 10 000
    FCFA l'unité dès 12 » and « À l'unité · 12 000 FCFA » with a quantity field, and the
    total « 42 pièces · 238 000 FCFA »; « Continuer » is disabled at 0 pieces and while a
    FROM count is under its minimum.
  - Option split: « Noir (reste 30) » caps at 30; « Blond — épuisé » has no stepper.
  - Delivery step with `shippingEnabled`: three choices « Je passe récupérer », « Livraison »,
    « Expédition »; Expédition asks « Ta ville et ton pays ».
  - Server: `offerPicks` from a CONSUMER → 400; a missing offer index → 400; a split total
    ≠ the picks' pieces → 400; a split above the stock left → 409 `STOCK_EXCEEDED` with the
    message « Il n'en reste que 4 en Rouge. »; stored picks are frozen copies and
    `quantity` = pieces; `fulfillment: 'SHIPPING'` without a place → 400.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Add `STOCK_EXCEEDED` to `errors.ts` and `api-messages.ts`.
  Keep `wantsDelivery` in sync: `DELIVERY`/`SHIPPING` → true, `PICKUP` → false.
- [ ] **Step 4: Run** → PASS, then the full gate.
- [ ] **Step 5: Commit** `feat(popup): resellers pick offers; stock per option; shipping`.

### Task 7: Orders, results and money

**Files:**
- Modify: `frontend/src/lib/server/tamani/orders.ts`, `order-queries.ts`, `serializers.ts`, `money.ts`, `stats.ts`, `home-bulletin.ts`
- Modify: `frontend/src/lib/tamani/order-form.ts`, `orders-view.ts`, `results-view.ts`, `client-view.ts`
- Modify: `frontend/src/components/app/OrderForm.tsx`, `frontend/src/app/(app)/app/commandes/nouvelle/page.tsx`
- Test: `orders.test.ts`, `order-form.test.ts`, `orders-view.test.ts`, `money.test.ts`, `orders.test.tsx`

**Interfaces:**
- Consumes: Tasks 2 and 4.
- Produces: `OrderCreate.offerPicks?: PickInput[]`, `OrderCreate.optionQuantities?`,
  `fulfillment: 'DELIVERY' | 'PICKUP' | 'SHIPPING'`; `Fulfillment` type gains `'SHIPPING'`;
  `fulfillmentText('SHIPPING', null, place)` → « Expédition à Lomé, Togo ».

- [ ] **Step 1: Failing tests:**
  - `convertResponseToOrder` with picks → `totalAmount` 238 000, `quantity` 42,
    `unitPrice` 5 667 (rounded average), picks and option split copied, fulfillment SHIPPING
    and a note « Expédition : Lomé, Togo »; without picks → unchanged behaviour (Review Focus 1).
  - Order form: a RESELLER on a product with offers sees the same picker as the popup; the
    preview reads « 2 × Lot de 12, 15 à 10 000 FCFA, 3 à l'unité = 238 000 FCFA ».
  - Order PATCH `paid: true` then `status: 'CANCELLED'`: `campaignStock` gives the pieces back.
  - `computeMoney` uses `lowestPiecePrice` for resellers.
  - Results and client pages print `picksText` under the answer.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** An order PATCH of `quantity` or `unitPrice` on an order with
  picks drops the picks (the wholesaler took over the price by hand).
- [ ] **Step 4: Run** → PASS, then the full gate.
- [ ] **Step 5: Commit** `feat(orders): orders carry the picked offers, shipping and stock`.

### Task 8: Recette, docs, PR

- [ ] **Step 1:** Ask the porteur's OK, then apply `9l_wholesale_offers` to Neon
  (`prisma migrate deploy`). Check: Sow Import's legacy wholesale products show one FROM offer.
- [ ] **Step 2:** Recette phone (390 px) + computer with the demo shop: create the wig
  product (unit « Personnalisé… » → « perruque », 3 offers), a campaign in stock with
  Noir 30 / Rouge 4 / Blond 0 and shipping, answer as a reseller (2 lots + 3 à l'unité,
  split, Expédition), convert to an order, mark it paid, check « reste » went down.
  Screenshots with numbers masked.
- [ ] **Step 3:** Docs: `docs/claude/` lot note, CLAUDE.md row, memory `launch-readiness`.
- [ ] **Step 4:** Push the branch, open the PR (`--repo mediaboostia-web/intention-d-achat`),
  merge after the recette (porteur's rule of 2026-11-08), check the live deploy.
