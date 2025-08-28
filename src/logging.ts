import axios from 'axios';
import { settings } from './config';

export function logInfo(message: string, logger: string = 'app') {
  console.log(`[INFO] [${logger}] ${message}`);
  sendToSlack('INFO', message).catch(() => {});
}

export function logWarn(message: string, logger: string = 'app') {
  console.warn(`[WARN] [${logger}] ${message}`);
  sendToSlack('WARN', message).catch(() => {});
}

export function logError(message: string, logger: string = 'app') {
  console.error(`[ERROR] [${logger}] ${message}`);
  sendToSlack('ERROR', message).catch(() => {});
}

async function sendToSlack(level: string, msg: string) {
  if (!settings.slackWebhookUrl) return;
  try {
    await axios.post(settings.slackWebhookUrl, { text: `[${level}] ${msg}` }, { timeout: 5000 });
  } catch {}
}
