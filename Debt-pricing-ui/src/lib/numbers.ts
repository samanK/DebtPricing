// Number parsing/formatting helpers. Users may type Persian/Arabic digits and separators, and enter
// rates as percentages; the API wants plain numbers and fractions (27% -> 0.27).

const DIGITS: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

/** Persian/Arabic digits -> ASCII, "٫" -> ".", thousands separators and whitespace removed. */
export function normalizeNumberInput(raw: string): string {
  return raw
    .replace(/[۰-۹٠-٩]/g, (ch) => DIGITS[ch] ?? ch)
    .replace(/٫/g, ".")
    .replace(/[,٬،\s\u00A0\u202F]/g, "");
}

const DECIMAL = /^(\d+\.?\d*|\.\d+)$/;

/** Non-negative decimal (no sign, no exponent), or null when the text is not a plain number. */
export function parseDecimal(raw: string): number | null {
  const s = normalizeNumberInput(raw);
  if (!DECIMAL.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Number of digits after the decimal point in the normalized text. */
export function decimalPlaces(raw: string): number {
  const s = normalizeNumberInput(raw);
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

/**
 * "27" -> 0.27, "28.7" -> 0.287. The decimal point is shifted in the text, not by multiplying floats,
 * so the API never receives values like 0.28700000000000003.
 */
export function percentToFraction(raw: string): number | null {
  const s = normalizeNumberInput(raw);
  if (!DECIMAL.test(s)) return null;

  const [intRaw = "", fracRaw = ""] = s.split(".");
  const intPart = intRaw === "" ? "0" : intRaw;
  const digits = intPart + fracRaw;
  const pointIndex = intPart.length - 2; // where the point lands after dividing by 100

  const text =
    pointIndex > 0
      ? `${digits.slice(0, pointIndex)}.${digits.slice(pointIndex)}`
      : `0.${"0".repeat(-pointIndex)}${digits}`;

  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/**
 * Live thousands grouping for an amount field: "1000000" -> "1,000,000", "1234.5" -> "1,234.5".
 * Keeps a trailing decimal point while typing; drops anything that is not a digit or a point.
 */
export function formatThousands(raw: string): string {
  const cleaned = normalizeNumberInput(raw).replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  const intPart = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const fracPart = dot === -1 ? null : cleaned.slice(dot + 1).replace(/\./g, "");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fracPart === null ? grouped : `${grouped}.${fracPart}`;
}

/** 0.287 -> "28.7", 0.27 -> "27" (trailing zeros trimmed, no float noise). */
export function fractionToPercent(fraction: number): string {
  return String(Number((fraction * 100).toFixed(6)));
}
