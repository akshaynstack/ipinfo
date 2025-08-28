import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/auth';
import { createUserIfNotExists, issueApiKey, revokeApiKey, deleteUser, deleteUserByEmail } from '../services/apiKeyService';
import { logInfo } from '../logging';

export const auth = new Hono();

const createUserSchema = z.object({ email: z.string().email() });
const issueKeySchema = z.object({
  user_id: z.number(),
  name: z.string().min(1),
  rate_limit_per_min: z.number().int().positive().optional(),
});

auth.post('/users', requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return c.json({ detail: parsed.error.flatten() }, 400);
  const user = await createUserIfNotExists(parsed.data.email);
  logInfo(`User created id=${user.id} email=${user.email}`, 'audit');
  return c.json({ id: user.id, email: user.email }, 201);
});

auth.post('/keys', requireAdmin, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = issueKeySchema.safeParse(body);
  if (!parsed.success) return c.json({ detail: parsed.error.flatten() }, 400);
  const { rawKey, entity } = await issueApiKey(parsed.data.user_id, parsed.data.name, parsed.data.rate_limit_per_min);
  logInfo(`API key issued id=${entity.id} user_id=${parsed.data.user_id} name=${entity.name} rlpm=${entity.rateLimitPerMin}`, 'audit');
  return c.json({ id: entity.id, name: entity.name, api_key: rawKey, rate_limit_per_min: entity.rateLimitPerMin }, 201);
});

auth.delete('/keys/:keyId', requireAdmin, async (c) => {
  const keyId = Number(c.req.param('keyId'));
  if (!Number.isInteger(keyId)) return c.json({ detail: 'Invalid key id' }, 400);
  await revokeApiKey(keyId);
  logInfo(`API key revoked id=${keyId}`, 'audit');
  return c.body(null, 204);
});

auth.delete('/users/:userId', requireAdmin, async (c) => {
  const userId = Number(c.req.param('userId'));
  if (!Number.isInteger(userId)) return c.json({ detail: 'Invalid user id' }, 400);
  const deleted = await deleteUser(userId);
  if (!deleted) return c.json({ detail: 'User not found' }, 404);
  logInfo(`User deleted id=${userId}`, 'audit');
  return c.body(null, 204);
});

auth.delete('/users', requireAdmin, async (c) => {
  const url = new URL(c.req.url);
  const email = url.searchParams.get('email');
  if (!email) return c.json({ detail: 'email is required' }, 400);
  const deleted = await deleteUserByEmail(email);
  if (!deleted) return c.json({ detail: 'User not found' }, 404);
  logInfo(`User deleted email=${email}`, 'audit');
  return c.body(null, 204);
});
