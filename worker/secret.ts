import type { Env } from "./env";
import { getSettings, setSettings } from "./settings";

/**
 * Loads the Telegram token entered in the first-run wizard.
 *
 * New installations store the token directly in the private D1 settings table and do not
 * require APP_ENCRYPTION_KEY. Existing installations that still have encrypted-token
 * columns remain supported when their legacy APP_ENCRYPTION_KEY is configured.
 * A BOT_TOKEN Worker secret is also supported as a manual recovery/override option.
 */
export async function hydrateBotToken(env: Env): Promise<void> {
  const s = await getSettings(env, { fresh: true });
  if (s.bot_token) {
    env.BOT_TOKEN = s.bot_token;
    return;
  }

  // Backward compatibility for older installations using AES-GCM token storage.
  if (s.bot_token_ciphertext && s.bot_token_iv) {
    if (!env.APP_ENCRYPTION_KEY) {
      if (env.BOT_TOKEN) return;
      throw new Error(
        "This installation contains a legacy encrypted bot token. Restore its previous APP_ENCRYPTION_KEY once, or set BOT_TOKEN as a Worker secret and complete token recovery.",
      );
    }
    const keyBytes = new TextEncoder().encode(env.APP_ENCRYPTION_KEY);
    const digest = await crypto.subtle.digest("SHA-256", keyBytes);
    const key = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
    const decode = (value: string) => Uint8Array.from(atob(value), (ch) => ch.charCodeAt(0));
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decode(s.bot_token_iv) },
      key,
      decode(s.bot_token_ciphertext),
    );
    env.BOT_TOKEN = new TextDecoder().decode(plain);
  }
}

/** Saves a token submitted in the first-run wizard; no application encryption key is required. */
export async function saveBotToken(env: Env, token: string): Promise<void> {
  await setSettings(env, { bot_token: token });
  env.BOT_TOKEN = token;
}
