# Tamani 07b : pays et monnaies

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tamani couvre la zone FCFA, la Guinée et la RD Congo. Chaque boutique affiche ses prix dans sa monnaie, sous son nom local, et son pays se fige au premier produit.

**Architecture:**
- Une table pure partagée par le navigateur et le serveur ([currency.ts](../../../frontend/src/lib/tamani/currency.ts) et [countries.ts](../../../frontend/src/lib/tamani/countries.ts)) : pays, indicatif, monnaie ISO, nom local.
- `Organization.currency` existe déjà, mais vaut toujours `XOF`. Elle est maintenant dérivée du pays, à la création et au changement. La migration `9b_currency_by_country` corrige les boutiques existantes.
- Chaque montant affiché passe par `formatMoney(montant, monnaie)`. Les prix de Tamani (page d'accueil, forfaits) restent en FCFA jusqu'au lot 8.

**Tech Stack:** Next.js 16, Prisma 5, libphonenumber-js (serveur et tests seulement), Vitest.

**Spec:** la feuille de route, partie « Lot 7b » et les décisions du porteur du 2026-10-29, qui font foi ; la [spec produit](../specs/2026-10-24-tamani-design.md) §5.2.

## Global Constraints

- **Pays** : UEMOA `SN CI ML BF TG BJ NE GW` (XOF), CEMAC `CM GA CG TD CF GQ` (XAF), `GN` (GNF), `CD` (CDF). Le Sénégal reste le pays par défaut.
- **Noms locaux** : XOF et XAF → « FCFA », GNF → « FG », CDF → « FC ». Le code ISO ne s'affiche jamais ; il reste pour SasPay (lot 8).
- **Montants** : entiers dans la plus petite unité (aucune de ces monnaies n'a de décimale à l'usage), de 1 à 100 000 000, comme aujourd'hui.
- **Pays figé** : un `PATCH` qui change le pays d'une boutique ayant au moins un produit (archivé compris) répond `409 SHOP_COUNTRY_LOCKED`. Sinon, le pays et la monnaie changent ensemble.
- Ne jamais journaliser un numéro.

## Review Focus

1. Une boutique guinéenne partage sa campagne : le message WhatsApp, l'aperçu du lien et le pop-up disent « FG », jamais « FCFA ».
2. Un grossiste tape « 65 000 FG » ou « 18 000 FC » dans un prix : c'est lu comme 65000 et 18000.
3. Un ancien numéro béninois à 8 chiffres (« 97 12 34 56 ») est accepté et devient le numéro à 10 chiffres (« 01 97 12 34 56 »).
4. Deux onglets : l'un ajoute le premier produit, l'autre change le pays juste après. Le second reçoit 409, et non un pays changé sous des prix déjà saisis.
5. Un export Excel d'une boutique en RD Congo : les colonnes d'argent disent « FC ».

---

### Task 1: Pays, monnaies et saisie des montants

**Files:** Create `frontend/src/lib/tamani/currency.ts` (+ test). Modify `frontend/src/lib/tamani/countries.ts` (+ test), `frontend/src/lib/tamani/fcfa-input.ts` (+ test), `frontend/src/lib/server/tamani/phone.test.ts`.

**Interfaces — Produces:**
- `type CurrencyCode = 'XOF' | 'XAF' | 'GNF' | 'CDF'`, `CURRENCY_LABEL`, `formatMoney(amount, currency) → "65 000 FG"`, `currencyLabel(currency)`.
- `SHOP_COUNTRIES` (16 pays, chacun avec `currency`), `currencyForCountry(code) → CurrencyCode`.
- `parseAmount(raw)`, qui enlève « FCFA », « CFA », « F », « FG », « GNF », « FC » et « CDF ». `parseFcfa` disparaît au profit de `parseAmount`.

- [ ] Tests rouges :
  - les 16 codes, dans l'ordre UEMOA, CEMAC, GN, CD ;
  - chaque pays est reconnu par libphonenumber et son indicatif est le bon ;
  - `formatMoney(65000, 'GNF') === '65 000 FG'` et `formatMoney(7500, 'XAF') === '7 500 FCFA'` ;
  - `parseAmount('65 000 FG') === 65000` et `parseAmount('18.000 FC') === 18000`.
- [ ] Implémenter, relancer, commit `feat(countries): CFA zone, Guinea and DR Congo, each with its currency`.

### Task 2: La boutique prend la monnaie de son pays, et son pays se fige

**Files:**
- Modify `frontend/src/app/api/shops/route.ts`, `frontend/src/app/api/shops/[orgId]/route.ts` (+ tests), `frontend/src/lib/server/tamani/errors.ts`, `frontend/src/lib/server/tamani/serializers.ts`, `frontend/src/lib/server/tamani/shop.ts`, `frontend/src/lib/tamani/api-messages.ts`, `frontend/src/components/app/ShopForm.tsx` (+ test).
- Create `frontend/prisma/migrations/9b_currency_by_country/migration.sql`.

**Interfaces — Produces:** `ShopDto.countryLocked: boolean` ; erreur `SHOP_COUNTRY_LOCKED` (409) ; `errorMessage` en français.

- [ ] Tests rouges :
  - la création en `GN` écrit `currency: 'GNF'` ;
  - le `PATCH` vers `CM` sans produit écrit `country: 'CM', currency: 'XAF'` ;
  - avec un produit, il répond 409 `SHOP_COUNTRY_LOCKED`, et le compte des produits porte `organizationId` ;
  - le contrôle et l'écriture tiennent dans une transaction sous le verrou `shop-country:<organizationId>`, et la création d'un produit prend le même verrou ;
  - `ShopForm` désactive le pays avec la phrase « Le pays ne change plus une fois un produit ajouté. » quand `countryLocked`.
- [ ] Migration : `UPDATE "Organization" SET "currency" = CASE …` d'après `country`.
- [ ] Implémenter, relancer, commit `feat(shops): currency from the country, country locked after the first product`.

### Task 3: Chaque montant dans la monnaie de la boutique

**Files:**
- Modify `share-message.ts`, `popup-metadata.ts`, `public-campaign.ts`, `popup-sheet.tsx` et les écrans qui appellent `formatXof` ou écrivent « FCFA » : `OrderDetail`, `OrderList`, `OrderForm`, `ProductForm`, `CampaignWizard`, `HomeView`, `ClientDetail`, `MoneyCard`, `ProductCard`, la page campagne, `client-view`, `orders-view`, `campaign-view`, `home-view`.
- Modify l'export (`campaign-export.ts` / `exports.ts`).
- Create `frontend/src/lib/server/observability/no-fcfa-literal.test.ts`.

**Interfaces:**
- Consumes `formatMoney` et `currencyLabel`.
- Produces :
  - `formatPriceLine(product, currency)` ;
  - `renderShareMessage(…, currency)` ;
  - `PublicCampaign.currency`.
  - `useShop().shop.currency` existe déjà.

- [ ] Tests rouges :
  - le message de partage et le pop-up d'une campagne `GNF` disent « FG » ;
  - l'export d'une boutique `CDF` titre ses colonnes d'argent « (FC) » ;
  - le garde-fou : aucun « FCFA » écrit en dur dans `src/` hors `currency.ts`, la page d'accueil, les forfaits et les tests.
- [ ] Implémenter, relancer, commit `feat(money): every amount in the shop's currency`.

### Task 4: Numéros

**Files:** Modify `frontend/src/lib/server/tamani/phone.ts` (+ test).

- [ ] Tests rouges :
  - `normalizePhone('97 12 34 56', 'BJ') === '+2290197123456'` ;
  - un numéro de chaque nouveau pays est valide avec son pays par défaut (Gabon, Congo, Tchad, Centrafrique, Guinée équatoriale, Guinée-Bissau, RD Congo).
- [ ] Implémenter (ancien numéro béninois à 8 chiffres → « 01 » devant), relancer, commit `feat(phone): new countries and the old 8-digit Benin numbers`.

### Task 5: Recette et documents

- [ ] Barrière complète, puis `next build`.
- [ ] Recette avec une boutique guinéenne de test, à 390 et 1 280 px :
  - un produit et une campagne affichent « FG » ;
  - le pop-up et l'export aussi ;
  - le pays est figé après le premier produit.
- [ ] CLAUDE.md (« Tamani countries and currencies (lot 7b) ») et la feuille de route. Commit `docs(countries): lot 7b rules and recette`.
