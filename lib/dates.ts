/**
 * Article dates are stored as plain YYYY-MM-DD strings. Parsing them with
 * `new Date("2026-10-26")` would treat them as UTC midnight and show the
 * wrong day in western timezones, so build the date from its parts instead.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function formatLongDate(value: string): string {
  return parseDateOnly(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthHeading(value: string): string {
  return parseDateOnly(value).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Groups YYYY-MM-DD into a YYYY-MM key so the archive can show month rules. */
export function monthKey(value: string): string {
  return value.slice(0, 7);
}

export function todayDateOnly(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
