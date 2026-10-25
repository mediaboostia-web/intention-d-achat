import { PrismaClient } from '@prisma/client';
import { prismaClientOptions } from './prisma-options';

declare global {
  // `var` is required for `declare global` to attach to globalThis.

  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ?? new PrismaClient(prismaClientOptions(process.env));

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
