import { Hono } from 'hono';
import { getCurrentApiKey, type AppBindings } from '../middleware/auth';
import { rateLimiter } from '../rateLimiter';
import { COUNTRY_CODES } from '../data/countryCodes';
import { lookupCountry } from '../geoip';

export const ip = new Hono<AppBindings>();

// Precompute ISO -> country info map to avoid per-request array scan
type CountryInfo = (typeof COUNTRY_CODES)[number];
const COUNTRY_BY_ISO: Record<string, CountryInfo> = COUNTRY_CODES.reduce((acc, c) => {
  acc[c.iso] = c;
  return acc;
}, {} as Record<string, CountryInfo>);
function getCountryInfo(iso: string | undefined) {
  if (!iso) return undefined;
  return COUNTRY_BY_ISO[iso];
}

function getClientIp(c: any): string {
  const xff = c.req.header('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xri = c.req.header('x-real-ip');
  if (xri) return xri.trim();
  const cf = c.req.header('cf-connecting-ip');
  if (cf) return cf.trim();
  const tci = c.req.header('true-client-ip');
  if (tci) return tci.trim();
  const xci = c.req.header('x-client-ip');
  if (xci) return xci.trim();
  return (c.req.raw as any).socket?.remoteAddress ?? '0.0.0.0';
}

ip.get('/ip', getCurrentApiKey, async (c) => {
  const apikey = c.get('apikey');
  const allowed = await rateLimiter.allow(apikey.id, apikey.rateLimitPerMin);
  if (!allowed) return c.json({ detail: 'Rate limit exceeded' }, 429);

  const clientIp = getClientIp(c);
  try {
    const res = await lookupCountry(clientIp);
    if (!res) return c.json({ ip: clientIp, error: 'IP address not found in GeoLite2 database' });
    const country = getCountryInfo(res.iso);
    if (country) {
      return c.json({
        ip: clientIp,
        country: country.country,
        country_code: country.code,
        country_iso: country.iso,
      });
    }
    return c.json({ ip: clientIp, error: `ISO code ${res.iso} not found in country list` });
  } catch {
    return c.json({ ip: clientIp, error: 'GeoIP lookup failed' }, 500);
  }
});
