import { ConflictException, NotFoundException } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { PoliciesV4Service } from "./policies.v4.service";
import { Policy } from "./schemas/policy.schema";

function execResolving<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

function chainable() {
  const chain = {
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };
  return chain;
}

describe("PoliciesV4Service", () => {
  let service: PoliciesV4Service;
  let policyModelMock: jest.Mock & {
    findOne: jest.Mock;
    find: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOneAndDelete: jest.Mock;
  };

  beforeEach(async () => {
    const modelFn = jest.fn() as unknown as jest.Mock & {
      findOne: jest.Mock;
      find: jest.Mock;
      findOneAndUpdate: jest.Mock;
      findOneAndDelete: jest.Mock;
    };
    modelFn.findOne = jest.fn();
    modelFn.find = jest.fn();
    modelFn.findOneAndUpdate = jest.fn();
    modelFn.findOneAndDelete = jest.fn();
    policyModelMock = modelFn;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesV4Service,
        { provide: REQUEST, useValue: { user: { username: "tester" } } },
        { provide: getModelToken(Policy.name), useValue: policyModelMock },
      ],
    }).compile();

    service = await module.resolve<PoliciesV4Service>(PoliciesV4Service);
  });

  describe("create", () => {
    it("0100: saves a new document with createdBy from the request user", async () => {
      const save = jest.fn().mockResolvedValue({ _id: "id1" });
      policyModelMock.mockImplementation(function (
        this: { save: jest.Mock },
        dto: Record<string, unknown>,
      ) {
        this.save = save;
        Object.assign(this, dto);
      });

      const result = await service.create({
        ownerGroup: "g1",
        type: "archive",
      });

      expect(policyModelMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerGroup: "g1",
          type: "archive",
          createdBy: "tester",
        }),
      );
      expect(save).toHaveBeenCalled();
      expect(result).toEqual({ _id: "id1" });
    });

    it("0110: maps a duplicate-key race to ConflictException", async () => {
      const save = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));
      policyModelMock.mockImplementation(function (this: { save: jest.Mock }) {
        this.save = save;
      });

      await expect(
        service.create({ ownerGroup: "g1", type: "archive" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("findAll", () => {
    it("0200: applies the live filter and delegates limit/skip/sort to the query", async () => {
      const chain = chainable();
      chain.exec.mockResolvedValue([{ _id: "id1" }]);
      policyModelMock.find.mockReturnValue(chain);

      const result = await service.findAll({
        where: { ownerGroup: "g1" },
        limits: { limit: 5, skip: 1, order: "ownerGroup:asc" },
      });

      const [whereFilter] = policyModelMock.find.mock.calls[0];
      expect(whereFilter).toMatchObject({
        ownerGroup: "g1",
        supersededBy: { $exists: false },
      });
      expect(result).toEqual([{ _id: "id1" }]);
    });
  });

  describe("findOne", () => {
    it("0300: returns the document when it exists", async () => {
      policyModelMock.findOne.mockReturnValue(execResolving({ _id: "id1" }));

      const result = await service.findOne("id1");

      const [filter] = policyModelMock.findOne.mock.calls[0];
      expect(filter).toMatchObject({
        _id: "id1",
        supersededBy: { $exists: false },
      });
      expect(result).toEqual({ _id: "id1" });
    });

    it("0310: throws NotFoundException when it doesn't", async () => {
      policyModelMock.findOne.mockReturnValue(execResolving(null));

      await expect(service.findOne("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("0400: sets fields as given, replacing nested objects like policyParams wholesale rather than merging", async () => {
      policyModelMock.findOneAndUpdate.mockReturnValue(
        execResolving({ _id: "id1" }),
      );

      await service.update("id1", {
        policyParams: { tapeRedundancy: "high" },
      });

      const [filter, updateDoc, options] =
        policyModelMock.findOneAndUpdate.mock.calls[0];
      expect(filter).toMatchObject({
        _id: "id1",
        supersededBy: { $exists: false },
      });
      expect(updateDoc.$set).toMatchObject({
        policyParams: { tapeRedundancy: "high" },
      });
      expect(updateDoc.$set).not.toHaveProperty("updatedAt");
      expect(options.upsert).toBeUndefined();
    });

    it("0410: throws NotFoundException when the document doesn't exist", async () => {
      policyModelMock.findOneAndUpdate.mockReturnValue(execResolving(null));

      await expect(service.update("missing", { manager: [] })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("remove", () => {
    it("0500: deletes and returns the live document matching the id", async () => {
      policyModelMock.findOneAndDelete.mockReturnValue(
        execResolving({ _id: "id1" }),
      );

      const result = await service.remove("id1");

      const [filter] = policyModelMock.findOneAndDelete.mock.calls[0];
      expect(filter).toMatchObject({
        _id: "id1",
        supersededBy: { $exists: false },
      });
      expect(result).toEqual({ _id: "id1" });
    });

    it("0510: throws NotFoundException when the document doesn't exist", async () => {
      policyModelMock.findOneAndDelete.mockReturnValue(execResolving(null));

      await expect(service.remove("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
