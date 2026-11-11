import { describe, expect, it } from "vitest";
import { decimalPlaces, formatThousands, fractionToPercent, normalizeNumberInput, parseDecimal, percentToFraction } from "./numbers";

describe("formatThousands", () => {
  it.each([
    ["", ""],
    ["999", "999"],
    ["1000", "1,000"],
    ["1000000000", "1,000,000,000"],
    ["1,000,000", "1,000,000"],
    ["۱۰۰۰۰۰", "100,000"],
    ["1234.5", "1,234.5"],
    ["1000.", "1,000."],
    ["12a3", "123"],
  ])("%s -> %s", (input, expected) => {
    expect(formatThousands(input)).toBe(expected);
  });
  it("formatted text still parses to the same number", () => {
    expect(parseDecimal(formatThousands("1234567.25"))).toBe(1234567.25);
  });
});

describe("normalizeNumberInput", () => {
  it("converts Persian and Arabic digits and separators", () => {
    expect(normalizeNumberInput("۱٬۰۰۰٬۰۰۰")).toBe("1000000");
    expect(normalizeNumberInput("٢٧٫٥")).toBe("27.5");
    expect(normalizeNumberInput(" 1,000 000 ")).toBe("1000000");
  });
});

describe("parseDecimal", () => {
  it("accepts plain non-negative decimals", () => {
    expect(parseDecimal("1000000000")).toBe(1_000_000_000);
    expect(parseDecimal("0.5")).toBe(0.5);
    expect(parseDecimal(".5")).toBe(0.5);
    expect(parseDecimal("۲۷٫۵")).toBe(27.5);
  });
  it("rejects everything else", () => {
    for (const bad of ["", "abc", "-1", "1e5", "1.2.3", "12%", "0x10"]) expect(parseDecimal(bad)).toBeNull();
  });
});

describe("percentToFraction (no float noise)", () => {
  it.each([
    ["27", 0.27],
    ["28.7", 0.287],
    ["29", 0.29],
    ["5", 0.05],
    ["0.5", 0.005],
    [".5", 0.005],
    ["100", 1],
    ["0", 0],
    ["007", 0.07],
    ["۲۸٫۷", 0.287],
    ["12.3456", 0.123456],
  ])("%s%% -> %s", (input, expected) => {
    expect(percentToFraction(input)).toBe(expected);
  });
  it("returns null for non-numbers", () => {
    expect(percentToFraction("abc")).toBeNull();
    expect(percentToFraction("-5")).toBeNull();
  });
  it("serializes to a clean JSON number", () => {
    expect(JSON.stringify({ r: percentToFraction("28.7") })).toBe('{"r":0.287}');
  });
});

describe("fractionToPercent", () => {
  it.each([
    [0.27, "27"],
    [0.287, "28.7"],
    [0.29, "29"],
    [0.012, "1.2"],
    [0.000001, "0.0001"],
    [1, "100"],
    [0, "0"],
  ])("%s -> %s", (fraction, expected) => {
    expect(fractionToPercent(fraction)).toBe(expected);
  });
});

describe("decimalPlaces", () => {
  it("counts digits after the point", () => {
    expect(decimalPlaces("12")).toBe(0);
    expect(decimalPlaces("12.345")).toBe(3);
    expect(decimalPlaces("۱۲٫۵")).toBe(1);
  });
});
