import { NotFoundException, PreconditionFailedException } from "@nestjs/common";
import { QueryableClass } from "src/common/schemas/queryable.schema";
import { FilterQuery, Model } from "mongoose";
import {
  findOneAndUpdateWithOCC,
  nextOCCTimestamp,
  withOCCFilter,
} from "./occ-util";

describe("OCC Util", () => {
  const filterQuery: FilterQuery<QueryableClass> = { createdBy: "abc" };
  const unmodifiedSince = new Date("2026-01-01");

  it("adds unmodifiedSince if supplied", () => {
    const result = withOCCFilter(filterQuery, unmodifiedSince);
    expect(result).not.toBe(filterQuery);
    expect(result).toEqual({
      createdBy: "abc",
      updatedAt: { $lte: unmodifiedSince },
    });
  });

  it("returns original filter unchanged if no unmodifiedSince provided", () => {
    const result = withOCCFilter(filterQuery, undefined);
    expect(result).toBe(filterQuery);
    expect(result).toEqual(filterQuery);
  });

  describe("nextOCCTimestamp", () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it("returns the current time when no precondition is given", () => {
      const now = new Date("2026-01-01T00:00:00.500Z");
      jest.useFakeTimers().setSystemTime(now);

      expect(nextOCCTimestamp(undefined).getTime()).toBe(now.getTime());
    });

    it("returns the current time when it's already strictly after unmodifiedSince", () => {
      const now = new Date("2026-01-01T00:00:00.500Z");
      jest.useFakeTimers().setSystemTime(now);

      expect(nextOCCTimestamp(unmodifiedSince).getTime()).toBe(now.getTime());
    });

    it("bumps 1ms past unmodifiedSince when the clock hasn't advanced past it, closing the same-millisecond race", () => {
      jest.useFakeTimers().setSystemTime(unmodifiedSince);

      expect(nextOCCTimestamp(unmodifiedSince).getTime()).toBe(
        unmodifiedSince.getTime() + 1,
      );
    });

    it("bumps past unmodifiedSince even if the clock somehow went backwards", () => {
      jest
        .useFakeTimers()
        .setSystemTime(new Date(unmodifiedSince.getTime() - 1000));

      expect(nextOCCTimestamp(unmodifiedSince).getTime()).toBe(
        unmodifiedSince.getTime() + 1,
      );
    });
  });

  describe("findOneAndUpdateWithOCC", () => {
    const mockModel = (result: unknown) => {
      const exec = jest.fn().mockResolvedValue(result);
      const findOneAndUpdate = jest.fn().mockReturnValue({ exec });
      return {
        model: { findOneAndUpdate } as unknown as Model<QueryableClass>,
        findOneAndUpdate,
      };
    };

    it("applies the OCC filter, a race-safe updatedAt, and timestamps: false", async () => {
      const updated = { createdBy: "abc" } as QueryableClass;
      const { model, findOneAndUpdate } = mockModel(updated);

      const result = await findOneAndUpdateWithOCC(
        model,
        filterQuery,
        { instrumentGroup: "g1" },
        unmodifiedSince,
        "not found",
        "modified",
      );

      expect(result).toBe(updated);
      const [calledFilter, calledUpdate, calledOptions] =
        findOneAndUpdate.mock.calls[0];
      expect(calledFilter).toEqual({
        ...filterQuery,
        updatedAt: { $lte: unmodifiedSince },
      });
      expect(calledUpdate.instrumentGroup).toBe("g1");
      expect(calledUpdate.updatedAt.getTime()).toBeGreaterThanOrEqual(
        Date.now() - 1000,
      );
      expect(calledOptions).toMatchObject({
        new: true,
        timestamps: false,
      });
    });

    it("merges caller-supplied query options without dropping the OCC defaults", async () => {
      const { model, findOneAndUpdate } = mockModel({});

      await findOneAndUpdateWithOCC(
        model,
        filterQuery,
        {},
        undefined,
        "not found",
        "modified",
        { runValidators: true },
      );

      const [, , calledOptions] = findOneAndUpdate.mock.calls[0];
      expect(calledOptions).toMatchObject({
        new: true,
        timestamps: false,
        runValidators: true,
      });
    });

    it("throws NotFoundException when there's no match and no precondition was given", async () => {
      const { model } = mockModel(null);

      await expect(
        findOneAndUpdateWithOCC(
          model,
          filterQuery,
          {},
          undefined,
          "not found",
          "modified",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws PreconditionFailedException when there's no match and a precondition was given", async () => {
      const { model } = mockModel(null);

      await expect(
        findOneAndUpdateWithOCC(
          model,
          filterQuery,
          {},
          unmodifiedSince,
          "not found",
          "modified",
        ),
      ).rejects.toThrow(PreconditionFailedException);
    });
  });
});
