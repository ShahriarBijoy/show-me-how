export const name = 'openai-api';
export const KEY_VAR = 'OPENAI_API_KEY';

// Sync and offline: presence of the key is the whole check. The key is validated by the first
// real request; a 401/403 there is reported as "check OPENAI_API_KEY".
export function detect({ env = process.env } = {}) {
  if (!env[KEY_VAR]) return { ready: false, note: `${KEY_VAR} not set`, problems: [`${KEY_VAR} is not set`] };
  return { ready: true, note: '', problems: [] };
}
