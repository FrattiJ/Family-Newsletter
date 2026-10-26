import familyData from "@/family.json";

export type FamilyMember = {
  name: string;
  email: string;
  receivesEmail: boolean;
};

export type FamilyConfig = {
  newsletterName: string;
  tagline: string;
  members: FamilyMember[];
};

/**
 * The family roster lives in family.json at the root of the project so that
 * adding a relative is a one-line edit instead of a database chore. It is
 * imported rather than read from disk so that it is always bundled with the
 * deployed site.
 */
function buildConfig(): FamilyConfig {
  const raw = familyData as Partial<FamilyConfig>;
  const members = (raw.members ?? [])
    .filter((m) => m && typeof m.name === "string" && m.name.trim() !== "")
    .map((m) => ({
      name: m.name.trim(),
      email: (m.email ?? "").trim().toLowerCase(),
      receivesEmail: m.receivesEmail !== false && (m.email ?? "").includes("@"),
    }));

  return {
    newsletterName: raw.newsletterName?.trim() || "Our Family Newsletter",
    tagline: raw.tagline?.trim() || "",
    members,
  };
}

const config = buildConfig();

export function familyConfig(): FamilyConfig {
  return config;
}

export function familyNames(): string[] {
  return config.members.map((m) => m.name);
}

export function isFamilyName(name: string): boolean {
  return config.members.some((m) => m.name === name);
}

export function mailingList(): FamilyMember[] {
  return config.members.filter((m) => m.receivesEmail && m.email);
}

function required(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "" || value.startsWith("change-me")) {
    throw new Error(
      `Missing ${key}. Copy .env.example to .env.local and fill it in. ` +
        `See README.md for the walkthrough.`,
    );
  }
  return value;
}

export const env = {
  get familyPassword() {
    return required("FAMILY_PASSWORD");
  },
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get siteUrl() {
    return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  },
  /**
   * Any SMTP service works here. Gmail is the default because it costs
   * nothing and needs no domain of your own.
   */
  get smtpHost() {
    return process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  },
  get smtpPort() {
    return Number(process.env.SMTP_PORT?.trim() || "465");
  },
  get smtpUser() {
    return process.env.SMTP_USER?.trim() || "";
  },
  get smtpPassword() {
    return process.env.SMTP_PASSWORD?.trim() || "";
  },
  get emailFrom() {
    const configured = process.env.EMAIL_FROM?.trim();
    if (configured) return configured;
    // Fall back to the sending account, labelled with the paper's name.
    return `${config.newsletterName} <${process.env.SMTP_USER?.trim() ?? ""}>`;
  },
  get supabaseUrl() {
    // Vercel's Supabase integration sets NEXT_PUBLIC_SUPABASE_URL. Accept
    // either name so the integration works without copying values by hand.
    return (
      process.env.SUPABASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      ""
    );
  },
  get supabaseServiceKey() {
    // SUPABASE_SECRET_KEY is what that integration calls the key which
    // bypasses row level security; service_role is the older name for it.
    return (
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.SUPABASE_SECRET_KEY?.trim() ||
      ""
    );
  },
};

/** True once a mail account is configured; until then emails go to .data/outbox. */
export function emailConfigured(): boolean {
  return Boolean(env.smtpUser && env.smtpPassword);
}

/** True when Supabase credentials are present, so we store things in the cloud. */
export function usingSupabase(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceKey);
}
