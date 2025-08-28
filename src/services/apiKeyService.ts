import crypto from 'crypto';
import { prisma } from '../db';
import { settings } from '../config';

function hashKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): string {
  const rand = crypto.randomBytes(32).toString('base64url');
  return settings.apiKeyPrefix + rand;
}

export async function createUserIfNotExists(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data: { email, isActive: true } });
}

export async function issueApiKey(userId: number, name: string, rateLimitPerMin?: number) {
  const rate = rateLimitPerMin ?? settings.defaultRateLimitPerMin;
  const rawKey = generateApiKey();
  const keyHash = hashKey(rawKey);
  const entity = await prisma.aPIKey.create({ data: { userId, name, keyHash, rateLimitPerMin: rate, isActive: true } });
  return { rawKey, entity };
}

export async function revokeApiKey(keyId: number) {
  await prisma.aPIKey.update({ where: { id: keyId }, data: { isActive: false } });
}

export async function deleteUser(userId: number) {
  const res = await prisma.user.delete({ where: { id: userId } }).catch(() => null);
  return res ? 1 : 0;
}

export async function deleteUserByEmail(email: string) {
  const res = await prisma.user.delete({ where: { email } }).catch(() => null);
  return res ? 1 : 0;
}
