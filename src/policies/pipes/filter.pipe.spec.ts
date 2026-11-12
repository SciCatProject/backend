import { V3_WHERE_PIPE } from "./filter.pipe";

describe("V3_WHERE_PIPE", () => {
  it("0100: maps unambiguous v3 field names to their schema path", () => {
    const result = V3_WHERE_PIPE.transform({ tapeRedundancy: "low" });

    expect(result).toEqual({ "policyParams.tapeRedundancy": "low" });
  });

  it("0110: leaves the four archive/retrieve field names that collide onto the same schema field untranslated", () => {
    const result = V3_WHERE_PIPE.transform({
      archiveEmailNotification: true,
      retrieveEmailNotification: false,
      archiveEmailsToBeNotified: ["a@example.com"],
      retrieveEmailsToBeNotified: ["b@example.com"],
    });

    expect(result).toEqual({
      archiveEmailNotification: true,
      retrieveEmailNotification: false,
      archiveEmailsToBeNotified: ["a@example.com"],
      retrieveEmailsToBeNotified: ["b@example.com"],
    });
  });

  it("0120: still maps unambiguous fields when combined with an ambiguous one", () => {
    const result = V3_WHERE_PIPE.transform({
      tapeRedundancy: "low",
      retrieveEmailNotification: true,
    });

    expect(result).toEqual({
      "policyParams.tapeRedundancy": "low",
      retrieveEmailNotification: true,
    });
  });
});
