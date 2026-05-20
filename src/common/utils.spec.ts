// Currently only covers converToSI
import { convertToSI, parseDate } from "./utils";

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
