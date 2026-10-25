import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/server/prisma';
import { getPublicCampaign } from '@/lib/server/tamani/public-campaign';

/** One read per request, shared by the page and its metadata. */
export const loadCampaign = cache((code: string) => getPublicCampaign(prisma, code, new Date()));
