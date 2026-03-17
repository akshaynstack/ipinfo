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
  const headers = {
    xff: c.req.header('x-forwarded-for'),
    xri: c.req.header('x-real-ip'),
    cf: c.req.header('cf-connecting-ip'),
    tci: c.req.header('true-client-ip'),
    xci: c.req.header('x-client-ip'),
    remote: (c.req.raw as any).socket?.remoteAddress
  };
  
  // Debug log (remove or adjust in production)
  console.log('IP Detection Headers:', headers);

  if (headers.xff) return headers.xff.split(',')[0].trim();
  if (headers.xri) return headers.xri.trim();
  if (headers.cf) return headers.cf.trim();
  if (headers.tci) return headers.tci.trim();
  if (headers.xci) return headers.xci.trim();
  return headers.remote ?? '0.0.0.0';
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
