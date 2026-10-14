// Single source for the dataset lifecycle date defaults, shared by the
// configuration and the lifecycle schema defaults (which can't use the
// ConfigService).
const DEFAULT_PUBLICATION_SHIFT_IN_YEARS = 3;
// A negative retention shift means the data is kept indefinitely.
const DEFAULT_RETENTION_SHIFT_IN_YEARS = -1;

const parseYears = (value: string | undefined, fallback: number): number => {
  const years = Number.parseInt(value ?? "", 10);
  return Number.isNaN(years) ? fallback : years;
};

export const getPolicyPublicationShiftInYears = (): number =>
  parseYears(
    process.env.POLICY_PUBLICATION_SHIFT,
    DEFAULT_PUBLICATION_SHIFT_IN_YEARS,
  );

export const getPolicyRetentionShiftInYears = (): number =>
  parseYears(
    process.env.POLICY_RETENTION_SHIFT,
    DEFAULT_RETENTION_SHIFT_IN_YEARS,
  );

// Start of today (local time) shifted by the given number of years.
// February 29 becomes February 28 when the target year is not a leap year.
export const todayShiftedByYears = (years: number): Date => {
  const now = new Date();
  const year = now.getFullYear() + years;
  const month = now.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(now.getDate(), lastDayOfMonth));
};
