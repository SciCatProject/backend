import {
  convertToSI,
  createMetadataKeysInstance,
  encodeScientificMetadataKeys,
  mapScientificQuery,
  parseBoolean,
  parseDate,
} from "./utils";
import { ScientificRelation } from "./scientific-relation.enum";
import { IScientificFilter } from "./interfaces/common.interface";

describe("createMetadataKeysInstance decoded paths", () => {
  it.each([
    "scientificMetadata",
    "metadata",
    "customMetadata",
    "sampleCharacteristics",
  ])("flattens %s using decoded names", (field) => {
    const source = createMetadataKeysInstance("Dataset", {
      [field]: {
        "group%20name": {
          "attribute%20name": { value: 1, unit: "m", human_name: "Length" },
          "efficiency%25": 50,
          "literal%2520text": [1, 2],
          missing: null,
        },
      },
    });

    expect(source.metadata).toEqual({
      "group name.attribute name": {
        value: 1,
        unit: "m",
        human_name: "Length",
      },
      "group name.efficiency%": 50,
      "group name.literal%20text": [1, 2],
      "group name.missing": null,
    });
  });
});

describe("mapScientificQuery metadata paths", () => {
  const condition: IScientificFilter = {
    lhs: "group name.attribute name",
    relation: ScientificRelation.EQUAL_TO_STRING,
    rhs: "matched",
    unit: "",
  };

  it.each([
    ["attribute", "attribute"],
    ["attribute name", "attribute%20name"],
    ["group.attribute", "group.attribute"],
    ["group name.attribute name", "group%20name.attribute%20name"],
    ["group.subgroup.attribute", "group.subgroup.attribute"],
    ["group.efficiency%", "group.efficiency%25"],
    ["group.literal%20text", "group.literal%2520text"],
    ["group.Wavelength[A]", "group.Wavelength%5BA%5D"],
  ])("maps %s to the stored metadata path", (lhs, encodedPath) => {
    expect(mapScientificQuery("scientific", [{ ...condition, lhs }])).toEqual({
      $or: ["", ".v", ".value"].map((suffix) => ({
        [`scientificMetadata.${encodedPath}${suffix}`]: { $eq: "matched" },
      })),
    });
  });

  it("targets the same nested keys used by ingestion", () => {
    const metadata = encodeScientificMetadataKeys({
      "group name": { "attribute name": { value: "matched" } },
    });
    expect(metadata).toEqual({
      "group%20name": { "attribute%20name": { value: "matched" } },
    });
    const query = mapScientificQuery("scientific", [condition]);
    expect(query.$or).toContainEqual({
      "scientificMetadata.group%20name.attribute%20name.value": {
        $eq: "matched",
      },
    });
  });

  it.each([
    [ScientificRelation.GREATER_THAN, "$gt"],
    [ScientificRelation.GREATER_THAN_OR_EQUAL, "$gte"],
    [ScientificRelation.LESS_THAN, "$lt"],
    [ScientificRelation.LESS_THAN_OR_EQUAL, "$lte"],
  ])("supports nested %s conditions without units", (relation, operator) => {
    expect(
      mapScientificQuery("scientific", [{ ...condition, relation, rhs: 5 }]),
    ).toEqual({
      $or: ["", ".v", ".value"].map((suffix) => ({
        [`scientificMetadata.group%20name.attribute%20name${suffix}`]: {
          [operator]: 5,
        },
      })),
    });
  });

  it.each([
    [ScientificRelation.EQUAL_TO_NUMERIC, 5, { $eq: 5 }],
    [ScientificRelation.RANGE, [1, 5], { $gt: 1, $lt: 5 }],
  ])("supports nested %s conditions without units", (relation, rhs, match) => {
    expect(
      mapScientificQuery("scientific", [{ ...condition, relation, rhs }]),
    ).toEqual({
      "scientificMetadata.group%20name.attribute%20name.value": match,
    });
  });

  it.each([
    [ScientificRelation.EQUAL_TO_NUMERIC, "$eq"],
    [ScientificRelation.GREATER_THAN, "$gt"],
    [ScientificRelation.GREATER_THAN_OR_EQUAL, "$gte"],
    [ScientificRelation.LESS_THAN, "$lt"],
    [ScientificRelation.LESS_THAN_OR_EQUAL, "$lte"],
  ])("supports nested %s conditions with units", (relation, operator) => {
    expect(
      mapScientificQuery("scientific", [
        { ...condition, relation, rhs: 100, unit: "cm" },
      ]),
    ).toEqual({
      "scientificMetadata.group%20name.attribute%20name.valueSI": {
        [operator]: 1,
      },
      "scientificMetadata.group%20name.attribute%20name.unitSI": { $eq: "m" },
    });
  });

  it("converts both bounds of a nested range to SI", () => {
    expect(
      mapScientificQuery("scientific", [
        {
          ...condition,
          relation: ScientificRelation.RANGE,
          rhs: [100, 200],
          unit: "cm",
        },
      ]),
    ).toEqual({
      "scientificMetadata.group%20name.attribute%20name.valueSI": {
        $gt: 1,
        $lt: 2,
      },
      "scientificMetadata.group%20name.attribute%20name.unitSI": { $eq: "m" },
    });
  });

  it("also supports nested sample characteristics", () => {
    expect(
      mapScientificQuery("characteristics", [condition]).$or,
    ).toContainEqual({
      "sampleCharacteristics.group%20name.attribute%20name.value": {
        $eq: "matched",
      },
    });
  });
});

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
