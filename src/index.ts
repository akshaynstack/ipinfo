import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { health } from './routes/health';
import { auth } from './routes/auth';
import { ip } from './routes/ip';
import { docs } from './routes/docs';
import { settings } from './config';
import { logInfo } from './logging';
import type { AppBindings } from './middleware/auth';
import { prisma } from './db';
import { getGeoIPReader } from './geoip';

const app = new Hono<AppBindings>();

app.route('/health', health);
app.route('/v1/auth', auth);
app.route('/v1', ip);
app.route('/', docs);

const port = settings.port;

// Warm-up critical dependencies to avoid first-request latency (no top-level await)
void (async () => {
  try {
    await Promise.all([
      prisma.$connect().catch(() => {/* ignore connect errors here; prisma will retry on demand */}),
      getGeoIPReader().catch(() => {/* will retry on first use */}),
    ]);
  } finally {
    serve({ fetch: app.fetch, port }, () => {
      logInfo(`${settings.appName} started on :${port}`);
    });
  }
})();
