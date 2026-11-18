// Branding and setup contract shared by the Worker and the app: what an owner can customize, the color presets,
// and the validation rules both sides apply (the server always re-checks).

/** Public branding, sent in /api/me (`brand`) and /api/brand. */
export interface BrandInfo {
  /** Shown in the app header, bot messages and the bot profile, e.g. "Rocket SMM" */
  name: string;
  /** Uploaded logo (or the bot's profile photo), or null for the built-in monogram */
  logoUrl: string | null;
  /** Theme preset id (THEME_PRESETS) or "custom" */
  preset: string;
  /** #rrggbb accent used when preset is "custom" (ignored otherwise) */
  accent: string;
  /** Optional links shown in Profile */
  websiteUrl: string | null;
  /** Terms page: an external https link, or null to show the in-app terms text */
  termsUrl: string | null;
}

/** Public, unauthenticated: what a browser opening the app URL needs (setup wizard / "open in Telegram"). */
export interface PublicStatus {
  brand: BrandInfo;
  botUsername: string | null;
  /** Setup finished: webhook set, Mini App button set, an admin exists */
  configured: boolean;
}

/** /api/setup/status, only after the bot token was confirmed (setup token). */
export interface SetupStatus {
  botUsername: string | null;
  botName: string | null;
  /** Steps still to run, in order */
  pending: SetupStep[];
  /** An admin exists (OWNER_IDS env var or a claimed account) */
  ownerReady: boolean;
  /** One-tap link that opens the bot and claims admin (only while no admin exists) */
  claimLink: string | null;
}

export type SetupStep = "webhook" | "menu" | "texts0" | "texts1" | "commands";

export interface ThemePreset {
  id: string;
  label: string;
  /** Main accent (buttons, links, selection) for light mode */
  accent: string;
  /** Brighter variant for dark mode (readable on dark backgrounds) */
  accentDark: string;
}

/** Ready-made color themes. "cobalt" is the default. */
export const THEME_PRESETS: ThemePreset[] = [
  { id: "cobalt", label: "Ocean Blue", accent: "#2457ff", accentDark: "#5b82ff" },
  { id: "royal-blue", label: "Royal Blue", accent: "#2545b8", accentDark: "#7894ff" },
  { id: "midnight", label: "Midnight", accent: "#26345f", accentDark: "#91a7ed" },
  { id: "arctic", label: "Arctic", accent: "#168aad", accentDark: "#58c7e8" },
  { id: "skyline", label: "Skyline", accent: "#0a6fd6", accentDark: "#4aa3ff" },
  { id: "sapphire", label: "Sapphire", accent: "#1647a5", accentDark: "#6c9fff" },
  { id: "purple-haze", label: "Purple Haze", accent: "#7041c8", accentDark: "#ae8cff" },
  { id: "violet", label: "Royal Purple", accent: "#6d3cf5", accentDark: "#9a7bff" },
  { id: "lavender", label: "Lavender", accent: "#9270db", accentDark: "#c2aaff" },
  { id: "violet-night", label: "Violet Night", accent: "#54278f", accentDark: "#a879e8" },
  { id: "amethyst", label: "Amethyst", accent: "#8a4dbf", accentDark: "#c18be8" },
  { id: "neon-violet", label: "Neon Violet", accent: "#8b35e8", accentDark: "#c17aff" },
  { id: "emerald", label: "Emerald", accent: "#0f8a5f", accentDark: "#2fc48c" },
  { id: "forest", label: "Forest", accent: "#276749", accentDark: "#61b58a" },
  { id: "mint", label: "Mint", accent: "#159b83", accentDark: "#57d6bd" },
  { id: "sage", label: "Sage", accent: "#718b65", accentDark: "#a8c79a" },
  { id: "lime", label: "Lime", accent: "#668b16", accentDark: "#a6d84f" },
  { id: "teal", label: "Teal", accent: "#0b7f8c", accentDark: "#2cc0cf" },
  { id: "sunset", label: "Sunset", accent: "#e0531f", accentDark: "#ff7d4d" },
  { id: "coral", label: "Coral", accent: "#dc5b55", accentDark: "#ff9389" },
  { id: "rose", label: "Rose", accent: "#d61f69", accentDark: "#ff5c9a" },
  { id: "pink", label: "Pink", accent: "#c73591", accentDark: "#f27cc2" },
  { id: "cherry", label: "Cherry", accent: "#c4213a", accentDark: "#ff5c70" },
  { id: "ruby", label: "Ruby", accent: "#a7193f", accentDark: "#f05a7d" },
  { id: "golden", label: "Golden", accent: "#9a6b08", accentDark: "#e9bd45" },
  { id: "amber", label: "Amber", accent: "#b06a00", accentDark: "#ffb02e" },
  { id: "sand", label: "Sand", accent: "#9b7952", accentDark: "#d6b58b" },
  { id: "coffee", label: "Coffee", accent: "#6f4e37", accentDark: "#b58b6d" },
  { id: "graphite", label: "Graphite", accent: "#2f3542", accentDark: "#c9cfdb" },
  { id: "carbon", label: "Carbon", accent: "#343a40", accentDark: "#9ba5b1" },
  { id: "monochrome", label: "Monochrome", accent: "#555555", accentDark: "#bdbdbd" },
  { id: "silver", label: "Silver", accent: "#667085", accentDark: "#b8c2d1" },
  { id: "aurora", label: "Aurora", accent: "#167c80", accentDark: "#5bc7b6" },
  { id: "cyber", label: "Cyber", accent: "#00a3a3", accentDark: "#52eeee" },
  { id: "ocean-sunset", label: "Ocean Sunset", accent: "#087f9c", accentDark: "#ff8a62" },
  { id: "nordic", label: "Nordic", accent: "#456b91", accentDark: "#9abbdc" },
];

export const DEFAULT_PRESET = "cobalt";
export const PRESET_IDS = new Set(THEME_PRESETS.map((p) => p.id));

export const LIMITS = {
  brandName: 40,
  welcomeText: 1000,
  url: 300,
  /** Uploaded logo / banner, bytes */
  imageBytes: 700_000,
  customEmoji: 60,
} as const;

const CONTROL = /[\u0000-\u001f\u007f]/;

export function validBrandName(v: unknown): v is string {
  return typeof v === "string" && v.trim().length >= 1 && v.length <= LIMITS.brandName && !CONTROL.test(v);
}

export function validHexColor(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

/** https only, no credentials, a real host */
export function validHttpsUrl(v: unknown): v is string {
  if (typeof v !== "string" || !v || v.length > LIMITS.url) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !!u.hostname.includes(".") && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** Legacy key format retained only for backward compatibility with existing provider_id=0 records. */
export const NOTPANEL_KEY_RE = /^np_live_[A-Za-z0-9]{24,64}$/;

export function looksLikeNotPanelKey(v: unknown): v is string {
  return typeof v === "string" && NOTPANEL_KEY_RE.test(v.trim());
}

/** Custom emoji map: plain emoji → Telegram custom emoji id (needs the bot owner's Telegram Premium). */
export function validCustomEmojiMap(v: unknown): v is Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const entries = Object.entries(v as Record<string, unknown>);
  return (
    entries.length <= LIMITS.customEmoji &&
    // Keys are plain emoji: non-ASCII only, so a key can never match letters or message markup
    entries.every(([k, id]) => /^[^\u0000-\u007f]{1,8}$/u.test(k) && typeof id === "string" && /^\d{10,25}$/.test(id))
  );
}

/** Button icon ids (custom emoji on inline buttons). Empty string = no icon. */
export interface ButtonIcons {
  open: string;
  viewOrder: string;
  terms: string;
  invite: string;
}

export function validButtonIcons(v: unknown): v is ButtonIcons {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (["open", "viewOrder", "terms", "invite"] as const).every((k) => typeof o[k] === "string" && (o[k] === "" || /^\d{10,25}$/.test(o[k] as string)));
}
