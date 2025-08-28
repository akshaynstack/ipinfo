import maxmind, { Reader } from 'maxmind';
import { settings } from './config';

let cachedReader: Reader<any> | null = null;

export async function getGeoIPReader(): Promise<Reader<any>> {
  if (cachedReader) return cachedReader;
  cachedReader = await maxmind.open(settings.geoipDbPath);
  return cachedReader;
}

export async function lookupCountry(ip: string): Promise<{ iso?: string } | null> {
  const reader = await getGeoIPReader();
  try {
    const result: any = reader.get(ip);
    const iso = result?.country?.iso_code as string | undefined;
    return { iso };
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('AddressNotFoundError')) return null;
    throw e;
  }
}
