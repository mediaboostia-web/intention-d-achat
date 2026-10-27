// Tamani lot 3: the core schema matches the cross-lot contract of the
// roadmap (docs/superpowers/plans/2026-10-24-tamani-roadmap.md §Contrats)
// and ships as the versioned migration 6_tamani_core.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRISMA = resolve(__dirname, '../../../../prisma');
const SCHEMA = resolve(PRISMA, 'schema.prisma');
const MIGRATION = resolve(PRISMA, 'migrations/6_tamani_core/migration.sql');

const schema = readFileSync(SCHEMA, 'utf8');

function modelBlock(name: string): string {
  const m = schema.match(new RegExp(`^model ${name} \\{([\\s\\S]*?)^\\}`, 'm'));
  return m?.[1] ?? '';
}

/** A field line `name Type …attributes`, whitespace-insensitive. */
function field(block: string, line: string): boolean {
  const [name, ...rest] = line.split(' ');
  const pattern = rest.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
  return new RegExp(`^\\s*${name}\\s+${pattern}(\\s|$)`, 'm').test(block);
}

const CONTRACT: Record<string, string[]> = {
  DeliveryZone: ['organizationId String', 'name String', 'sortOrder Int @default(0)'],
  Product: [
    'organizationId String',
    'name String',
    'description String?',
    'unitLabel String @default("pièce")',
    'unitPrice Int',
    'wholesalePrice Int?',
    'wholesaleMinQty Int?',
    'costPrice Int?',
    'photos Json @default("[]")',
    'optionLabel String?',
    'options String[]',
    'archivedAt DateTime?',
  ],
  Campaign: [
    'organizationId String',
    'productId String',
    'title String',
    'availability String',
    'availableAt DateTime?',
    'stockQuantity Int?',
    'plannedQuantity Int?',
    'showStock Boolean @default(false)',
    'endsAt DateTime?',
    'deliveryEnabled Boolean @default(false)',
    'showLiveCounter Boolean @default(true)',
    'shareTemplate String',
    'status String @default("DRAFT")',
    'closedAt DateTime?',
    'arrivedAt DateTime?',
  ],
  CampaignLink: [
    'campaignId String',
    'code String @unique',
    'label String',
    'isDefault Boolean @default(false)',
    'openCount Int @default(0)',
  ],
  Respondent: [
    'organizationId String',
    'phoneE164 String?',
    'firstName String?',
    'notes String?',
    'firstSeenAt DateTime',
    'lastSeenAt DateTime',
    'anonymizedAt DateTime?',
  ],
  Response: [
    'campaignId String',
    'organizationId String',
    'linkId String?',
    'respondentId String?',
    'deviceId String',
    'interested Boolean?',
    'notInterestedReason String?',
    'buyerType String?',
    'quantity Int?',
    'option String?',
    'timing String?',
    'wantsDelivery Boolean?',
    'zoneId String?',
    'completedAt DateTime?',
    'locked Boolean @default(false)',
    'suspicious Boolean @default(false)',
  ],
  Subscription: [
    'organizationId String @unique',
    'plan String @default("FREE")',
    'currentPeriodEnd DateTime?',
    'graceUntil DateTime?',
  ],
};

const CONSTRAINTS: Record<string, string[]> = {
  DeliveryZone: ['@@unique([organizationId, name])'],
  Respondent: ['@@unique([organizationId, phoneE164])'],
  Response: [
    '@@unique([campaignId, deviceId])',
    '@@unique([campaignId, respondentId])',
    '@@index([organizationId, completedAt])',
    '@@index([campaignId, completedAt])',
    '@@index([respondentId])',
  ],
};

describe('Tamani core schema (lot 3)', () => {
  it.each(Object.entries(CONTRACT))('model %s declares the contract fields', (model, fields) => {
    const block = modelBlock(model);
    expect(block, `model ${model} missing in ${SCHEMA}`).not.toBe('');
    for (const f of [...fields, 'id String @id @default(cuid())']) {
      expect(field(block, f), `${model}.${f}`).toBe(true);
    }
  });

  it('Organization gains the shop fields', () => {
    const block = modelBlock('Organization');
    for (const f of [
      'whatsappPhone String?',
      'country String @default("SN")',
      'currency String @default("XOF")',
      'logoUrl String?',
      'coefConsumer Float @default(0.5)',
      'coefReseller Float @default(0.7)',
    ]) {
      expect(field(block, f), `Organization.${f}`).toBe(true);
    }
  });

  it('Organization has an optional description', () => {
    expect(field(modelBlock('Organization'), 'description String?')).toBe(true);
    const sql = readFileSync(
      resolve(PRISMA, 'migrations/8_shop_description/migration.sql'),
      'utf8',
    );
    expect(sql).toMatch(/ALTER TABLE "Organization" ADD COLUMN\s+"description" TEXT/);
    expect(sql).not.toMatch(/\bDROP\b/);
  });

  it('Organization remembers the free plan offered verdict', () => {
    expect(field(modelBlock('Organization'), 'freeVerdictCampaignId String?')).toBe(true);
    const sql = readFileSync(resolve(PRISMA, 'migrations/8b_free_verdict/migration.sql'), 'utf8');
    expect(sql).toMatch(/ALTER TABLE "Organization" ADD COLUMN\s+"freeVerdictCampaignId" TEXT/);
    expect(sql).not.toMatch(/\bDROP\b/);
  });

  it('migration folders sort as text in the order they were written', () => {
    // Prisma applies them in text order: a "10_…" would run before "2_…".
    const names = readdirSync(resolve(PRISMA, 'migrations'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const numbers = names.map((n) => Number.parseInt(n, 10));
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });

  it.each(Object.entries(CONSTRAINTS))(
    'model %s declares its unique keys and indexes',
    (model, lines) => {
      const block = modelBlock(model).replace(/\s+/g, '');
      for (const l of lines) expect(block, `${model} ${l}`).toContain(l.replace(/\s+/g, ''));
    },
  );

  it('money fields are Int, never Float or Decimal', () => {
    expect(schema).not.toMatch(/^\s*(unitPrice|wholesalePrice|costPrice)\s+(Float|Decimal)/m);
  });

  it('ships as migration 6_tamani_core', () => {
    expect(existsSync(MIGRATION), MIGRATION).toBe(true);
    const sql = readFileSync(MIGRATION, 'utf8');
    for (const table of Object.keys(CONTRACT)) {
      expect(sql, table).toContain(`CREATE TABLE "${table}"`);
    }
    expect(sql).toMatch(/ALTER TABLE "Organization" ADD COLUMN\s+"coefConsumer"/);
    expect(sql).not.toMatch(/\bDROP\b/);
  });
});
