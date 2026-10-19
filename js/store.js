import CONFIG from './config.js';
export const ONLINE = !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
const impl = ONLINE ? await import('./store-supabase.js') : await import('./store-local.js');
export const store = impl.default;
