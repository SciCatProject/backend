import {
  getPolicyPublicationShiftInYears,
  getPolicyRetentionShiftInYears,
  todayShiftedByYears,
} from "./policy-times";

describe("policy-times", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.useRealTimers();
  });

  it("should use the documented defaults when the env variables are unset", () => {
    delete process.env.POLICY_PUBLICATION_SHIFT;
    delete process.env.POLICY_RETENTION_SHIFT;
    expect(getPolicyPublicationShiftInYears()).toBe(3);
    expect(getPolicyRetentionShiftInYears()).toBe(-1);
  });

  it("should read the env variables", () => {
    process.env.POLICY_PUBLICATION_SHIFT = "5";
    process.env.POLICY_RETENTION_SHIFT = "10";
    expect(getPolicyPublicationShiftInYears()).toBe(5);
    expect(getPolicyRetentionShiftInYears()).toBe(10);
  });

  it("should accept a trailing unit, as written in .env.example", () => {
    process.env.POLICY_PUBLICATION_SHIFT = "3 years";
    expect(getPolicyPublicationShiftInYears()).toBe(3);
  });

  it("should fall back to the defaults for empty or invalid values", () => {
    process.env.POLICY_PUBLICATION_SHIFT = "";
    process.env.POLICY_RETENTION_SHIFT = "forever";
    expect(getPolicyPublicationShiftInYears()).toBe(3);
    expect(getPolicyRetentionShiftInYears()).toBe(-1);
  });

  it("should shift today by whole years keeping the day of the month", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 13, 15, 30));
    expect(todayShiftedByYears(3)).toEqual(new Date(2029, 9, 13));
    expect(todayShiftedByYears(0)).toEqual(new Date(2026, 9, 13));
  });

  it("should clamp February 29 to February 28 in a non-leap target year", () => {
    jest.useFakeTimers().setSystemTime(new Date(2028, 1, 29, 10));
    expect(todayShiftedByYears(1)).toEqual(new Date(2029, 1, 28));
    expect(todayShiftedByYears(4)).toEqual(new Date(2032, 1, 29));
  });
});
