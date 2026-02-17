import { Test, TestingModule } from "@nestjs/testing";
import { RuntimeConfigController } from "./runtime-config.controller";
import { RuntimeConfigService } from "./runtime-config.service";
import { NotFoundException } from "@nestjs/common";
import { Request } from "express";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";

class RuntimeConfigServiceMock {
  getConfig = jest.fn();
  updateConfig = jest.fn();
}

class CaslAbilityFactoryMock {}

describe("RuntimeConfigController", () => {
  let controller: RuntimeConfigController;
  let service: RuntimeConfigServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RuntimeConfigController],
      providers: [
        { provide: RuntimeConfigService, useClass: RuntimeConfigServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = await module.resolve<RuntimeConfigController>(
      RuntimeConfigController,
    );
    service = module.get(RuntimeConfigService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getConfig", () => {
    it("should return config when found", async () => {
      const cfg = { cid: "frontendConfig", data: { a: 1 } };
      service.getConfig.mockResolvedValue(cfg);

      const res = await controller.getConfig("frontendConfig");
      expect(res).toEqual(cfg);
      expect(service.getConfig).toHaveBeenCalledWith("frontendConfig");
    });

    it("should throw NotFoundException when missing", async () => {
      service.getConfig.mockRejectedValue(new NotFoundException("not found"));

      await expect(controller.getConfig("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateConfig", () => {
    it("should call service.updateConfig with user from request", async () => {
      const cfg = { cid: "frontendConfig", data: { a: 2 } };
      service.updateConfig.mockResolvedValue(cfg);

      const mockReq = {
        user: { username: "adminIngestor" },
      } as unknown as Request;

      const dto = { data: { a: 2 } };

      const res = await controller.updateConfig(mockReq, "frontendConfig", dto);

      expect(res).toEqual(cfg);
      expect(service.updateConfig).toHaveBeenCalledWith(
        "frontendConfig",
        dto,
        mockReq.user,
      );
    });

    it("should throw NotFoundException from service when config id does not exist", async () => {
      service.updateConfig.mockRejectedValue(
        new NotFoundException("not found"),
      );

      const mockReq = {
        user: { username: "adminIngestor" },
      } as unknown as Request;

      await expect(
        controller.updateConfig(mockReq, "missing", { data: {} }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
