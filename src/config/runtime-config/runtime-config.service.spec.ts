import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { RuntimeConfigService } from "./runtime-config.service";
import { RuntimeConfig } from "./schemas/runtime-config.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";

class ConfigServiceMock {
  get = jest.fn();
}

class RuntimeConfigModelMock {
  findOne = jest.fn();
  findOneAndUpdate = jest.fn();
  updateOne = jest.fn();
  create = jest.fn();
}

describe("RuntimeConfigService", () => {
  let service: RuntimeConfigService;
  let configService: ConfigServiceMock;
  let model: RuntimeConfigModelMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuntimeConfigService,
        { provide: ConfigService, useClass: ConfigServiceMock },
        {
          provide: getModelToken(RuntimeConfig.name),
          useClass: RuntimeConfigModelMock,
        },
      ],
    }).compile();

    service = module.get(RuntimeConfigService);
    configService = module.get(ConfigService);
    model = module.get(getModelToken(RuntimeConfig.name));
  });

  afterEach(() => jest.clearAllMocks());

  describe("getConfig", () => {
    it("returns config when found", async () => {
      model.findOne.mockReturnValue({
        lean: () => ({ cid: "c1", data: { a: 1 } }),
      });

      await expect(service.getConfig("c1")).resolves.toEqual({
        cid: "c1",
        data: { a: 1 },
      });
      expect(model.findOne).toHaveBeenCalledWith({ cid: "c1" });
    });

    it("throws NotFoundException when missing", async () => {
      model.findOne.mockReturnValue({ lean: () => null });

      await expect(service.getConfig("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateConfig", () => {
    it("updates and returns updated doc", async () => {
      const updated = { cid: "c1", data: { a: 2 }, updatedBy: "admin" };
      model.findOneAndUpdate.mockResolvedValue(updated);

      const dto = { data: { a: 2 } };
      const user = { username: "admin" };
      const res = await service.updateConfig("c1", dto, user as JWTUser);

      expect(res).toEqual(updated);
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { cid: "c1" },
        {
          $set: expect.objectContaining({ data: { a: 2 }, updatedBy: "admin" }),
        },
        { new: true },
      );
    });

    it("throws NotFoundException if cid not found", async () => {
      model.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateConfig("missing", { data: {} }, {
          username: "admin",
        } as JWTUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("syncConfig", () => {
    it("skips when config is empty/missing", async () => {
      configService.get.mockReturnValue({});

      await service.syncConfig("frontendConfig");

      expect(model.findOne).not.toHaveBeenCalled();
      expect(model.create).not.toHaveBeenCalled();
      expect(model.updateOne).not.toHaveBeenCalled();
    });

    it("creates entry if not existing", async () => {
      const source = { foo: "bar" };
      configService.get.mockReturnValue(source);
      model.findOne.mockReturnValue({ lean: () => null });
      model.create.mockResolvedValue({ cid: "x" });

      await service.syncConfig("frontendConfig");

      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cid: "frontendConfig",
          data: source,
          createdBy: "system",
          updatedBy: "system",
        }),
      );
    });

    it("overwrites entry if existing", async () => {
      const source = { foo: "bar" };
      configService.get.mockReturnValue(source);
      model.findOne.mockReturnValue({
        lean: () => ({ cid: "frontendConfig" }),
      });
      model.updateOne.mockResolvedValue({ acknowledged: true });

      await service.syncConfig("frontendConfig");

      expect(model.updateOne).toHaveBeenCalledWith(
        { cid: "frontendConfig" },
        { data: source, updatedBy: "system" },
      );
    });
  });

  describe("onModuleInit", () => {
    it("syncs each configId from configList", async () => {
      configService.get.mockReturnValue(["a", "b"]);
      const spy = jest.spyOn(service, "syncConfig").mockResolvedValue();

      await service.onModuleInit();

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith("a");
      expect(spy).toHaveBeenCalledWith("b");
    });
  });
});
