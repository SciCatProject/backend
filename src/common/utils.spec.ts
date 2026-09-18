// Currently only covers converToSI
import {
  convertToSI,
  parseBoolean,
  parseDate,
  parseIfUnmodifiedSince,
} from "./utils";

describe("convertToSI", () => {
  it("should convert a known unit to SI successfully", () => {
    const result = convertToSI(1, "cm");
    expect(result.valueSI).toBeCloseTo(0.01);
    expect(result.unitSI).toEqual("m");
  });

  it("should convert angstrom to SI successfully", () => {
    const result = convertToSI(1, "Å");
    expect(result.valueSI).toBeCloseTo(1e-10);
    expect(result.unitSI).toEqual("m");
  });

  it("should handle different versions of Å in unicode", () => {
    const inputUnit = "\u212B"; // Old unicode representation of "Å", is not boolean equal to the one we added.
    const result = convertToSI(1, inputUnit);
    expect(result.valueSI).toBeCloseTo(1e-10);
    expect(result.unitSI).toEqual("m");
  });

  it("should return the input value and unit if conversion fails", () => {
    const result = convertToSI(1, "invalidUnit");
    expect(result.valueSI).toEqual(1);
    expect(result.unitSI).toEqual("invalidUnit");
  });

  it("should convert SI units correctly", () => {
    const result = convertToSI(1000, "g");
    expect(result.valueSI).toBeCloseTo(1);
    expect(result.unitSI).toEqual("kg");
  });

  it("should handle already normalized units", () => {
    const result = convertToSI(1, "m");
    expect(result.valueSI).toEqual(1);
    expect(result.unitSI).toEqual("m");
  });

  it("should handle negative values properly", () => {
    const result = convertToSI(-5, "cm");
    expect(result.valueSI).toBeCloseTo(-0.05);
    expect(result.unitSI).toEqual("m");
  });
});

describe("parseDate", () => {
  it("should parse a valid date string", () => {
    const dateString = "2023-01-01T00:00:00Z";
    const result = parseDate(dateString);
    expect(result).toBeInstanceOf(Date);
    expect(result?.getTime()).toEqual(new Date(dateString).getTime());
  });

  it("should return undefined for an invalid date string", () => {
    const dateString = "invalid-date";
    const result = parseDate(dateString);
    expect(result).toBeUndefined();
  });

  it("should return undefined for undefined input", () => {
    const result = parseDate(undefined);
    expect(result).toBeUndefined();
  });
});

describe("parseIfUnmodifiedSince", () => {
  it("returns undefined when the header is absent", () => {
    expect(parseIfUnmodifiedSince(undefined)).toBeUndefined();
  });

  it("returns undefined when the header is unparseable", () => {
    expect(parseIfUnmodifiedSince("not-a-date")).toBeUndefined();
  });

  it("widens a standard HTTP-date (no fractional seconds) to the end of its second", () => {
    const raw = "Thu, 01 Jan 2026 00:00:00 GMT";
    const result = parseIfUnmodifiedSince(raw);

    expect(result?.getTime()).toBe(new Date(raw).getTime() + 999);
  });

  it("widens an ISO-8601 value with no fractional seconds the same way", () => {
    const raw = "2026-01-01T00:00:00Z";
    const result = parseIfUnmodifiedSince(raw);

    expect(result?.getTime()).toBe(new Date(raw).getTime() + 999);
  });

  it("compares an ISO-8601 value with genuine millisecond precision exactly, unwidened", () => {
    const raw = "2026-01-01T00:00:00.123Z";
    const result = parseIfUnmodifiedSince(raw);

    expect(result?.getTime()).toBe(new Date(raw).getTime());
  });

  it("does not widen an exact millisecond-precision value that happens to be .000 - the bug this guards against", () => {
    const raw = "2026-01-01T00:00:00.000Z";
    const result = parseIfUnmodifiedSince(raw);

    // Must compare exactly, not be pushed 999ms into the future: the client
    // explicitly provided sub-second precision (a literal ".000" in the
    // string), so this is indistinguishable from a genuine exact-millisecond
    // read and must not be treated as a coarse HTTP-date.
    expect(result?.getTime()).toBe(new Date(raw).getTime());
  });
});

describe("parseBoolean", () => {
  it("should return true for truthy values", () => {
    expect(parseBoolean(true)).toBe(true);
    expect(parseBoolean("true")).toBe(true);
    expect(parseBoolean(1)).toBe(true);
    expect(parseBoolean("1")).toBe(true);
    expect(parseBoolean("on")).toBe(true);
    expect(parseBoolean("yes")).toBe(true);
  });

  it("should return false for all other values", () => {
    expect(parseBoolean(false)).toBe(false);
    expect(parseBoolean("false")).toBe(false);
    expect(parseBoolean(0)).toBe(false);
    expect(parseBoolean("0")).toBe(false);
    expect(parseBoolean("off")).toBe(false);
    expect(parseBoolean(null)).toBe(false);
    expect(parseBoolean(undefined)).toBe(false);
  });
});
