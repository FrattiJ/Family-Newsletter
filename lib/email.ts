import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { env, familyConfig, mailingList } from "./config";
import { formatLongDate } from "./dates";
import { photoToken } from "./session";
import type { Article } from "./store";

export type BlastResult = {
  /** How many relatives the story actually went out to. */
  sent: number;
  /** Set when no Resend key is configured and we wrote files instead. */
  savedToOutbox: boolean;
  errors: string[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function photoUrlFor(article: Article): string | null {
  if (!article.photoId) return null;
  return `${env.siteUrl}/api/photo/${article.photoId}?t=${photoToken(article.photoId)}`;
}

function emailHtml(article: Article): string {
  const { newsletterName } = familyConfig();
  const photo = photoUrlFor(article);
  const body = paragraphsOf(article.body)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:17px;line-height:1.65;color:#1f1d1a;">${escapeHtml(p)}</p>`,
    )
    .join("");

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#efece4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efece4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fbf9f4;border:1px solid #d8d2c4;">

        <tr><td style="padding:28px 32px 18px;text-align:center;border-bottom:3px double #1f1d1a;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:bold;letter-spacing:-0.5px;color:#1f1d1a;">
            ${escapeHtml(newsletterName)}
          </div>
          <div style="margin-top:8px;font-family:Georgia,serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8a8273;">
            Family Bulletin &middot; ${escapeHtml(formatLongDate(article.eventDate))}
          </div>
        </td></tr>

        <tr><td style="padding:28px 32px 8px;">
          <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;color:#1f1d1a;">
            ${escapeHtml(article.title)}
          </h1>
          <div style="font-family:Georgia,serif;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#9c2b1b;padding-bottom:18px;border-bottom:1px solid #e0dacb;">
            By ${escapeHtml(article.authorName)}
          </div>
        </td></tr>

        ${
          photo
            ? `<tr><td style="padding:20px 32px 0;">
                 <img src="${photo}" alt="" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid #d8d2c4;" />
               </td></tr>`
            : ""
        }

        <tr><td style="padding:22px 32px 8px;font-family:Georgia,'Times New Roman',serif;">
          ${body}
        </td></tr>

        <tr><td style="padding:14px 32px 34px;text-align:center;">
          <a href="${env.siteUrl}/newsletter"
             style="display:inline-block;background:#1f1d1a;color:#fbf9f4;font-family:Georgia,serif;font-size:15px;
                    text-decoration:none;padding:14px 26px;letter-spacing:0.5px;">
            Read the whole newsletter
          </a>
        </td></tr>

        <tr><td style="padding:16px 32px 24px;border-top:1px solid #e0dacb;text-align:center;
                       font-family:Georgia,serif;font-size:12px;line-height:1.6;color:#8a8273;">
          You are getting this because you are family.<br />
          Only people on the family list can read or post to ${escapeHtml(newsletterName)}.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailText(article: Article): string {
  const { newsletterName } = familyConfig();
  return [
    newsletterName.toUpperCase(),
    formatLongDate(article.eventDate),
    "",
    article.title,
    `By ${article.authorName}`,
    "",
    ...paragraphsOf(article.body),
    "",
    `Read the whole newsletter: ${env.siteUrl}/newsletter`,
  ].join("\n");
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Emails one story to everyone on the family list. Each relative gets their
 * own message, so nobody sees anybody else's address.
 */
export async function blastArticle(article: Article): Promise<BlastResult> {
  const recipients = mailingList();
  if (recipients.length === 0) {
    return { sent: 0, savedToOutbox: false, errors: [] };
  }

  const subject = `${familyConfig().newsletterName}: ${article.title}`;
  const html = emailHtml(article);
  const text = emailText(article);

  if (!env.resendApiKey) {
    // No email service configured yet: write the message to .data/outbox so
    // it can be opened in a browser and checked.
    const dir = path.join(process.cwd(), ".data", "outbox");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await writeFile(path.join(dir, `${stamp}-${article.id}.html`), html, "utf8");
    await writeFile(
      path.join(dir, `${stamp}-${article.id}.txt`),
      `To: ${recipients.map((r) => r.email).join(", ")}\nSubject: ${subject}\n\n${text}`,
      "utf8",
    );
    return { sent: recipients.length, savedToOutbox: true, errors: [] };
  }

  const resend = new Resend(env.resendApiKey);
  const errors: string[] = [];
  let sent = 0;

  for (const group of chunk(recipients, 100)) {
    const payload = group.map((member) => ({
      from: env.emailFrom,
      to: [member.email],
      subject,
      html,
      text,
    }));

    try {
      const { error } = await resend.batch.send(payload);
      if (error) errors.push(error.message);
      else sent += group.length;
    } catch (cause) {
      errors.push(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return { sent, savedToOutbox: false, errors };
}
