import { fractionToPercent } from "./numbers";

const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMoney(value: number): string {
  return money.format(value);
}

export function formatPercent(fraction: number): string {
  return `${fractionToPercent(fraction)}%`;
}

export function formatYears(years: number): string {
  return `${years} سال`;
}

export function formatUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
