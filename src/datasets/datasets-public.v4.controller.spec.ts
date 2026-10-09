import { Test, TestingModule } from "@nestjs/testing";
import { DatasetsService } from "./datasets.service";
import { DatasetsPublicV4Controller } from "./datasets-public.v4.controller";
import { ConfigModule } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";

class DatasetsServiceMock {
  findOneComplete = jest.fn();
}

describe("DatasetsController", () => {
  let controller: DatasetsPublicV4Controller;
  let datasetsService: DatasetsServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatasetsPublicV4Controller],
      imports: [ConfigModule],
      providers: [{ provide: DatasetsService, useClass: DatasetsServiceMock }],
    }).compile();

    controller = module.get<DatasetsPublicV4Controller>(
      DatasetsPublicV4Controller,
    );
    datasetsService = module.get(DatasetsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findByIdPublic", () => {
    it("should return the public dataset when found", async () => {
      const dataset = { pid: "pid-1", isPublished: true };
      datasetsService.findOneComplete.mockResolvedValue(dataset);

      const result = await controller.findByIdPublic("pid-1", undefined!);

      expect(datasetsService.findOneComplete).toHaveBeenCalledWith({
        where: { pid: "pid-1", isPublished: true },
        include: undefined,
      });
      expect(result).toEqual(dataset);
    });

    it("should throw NotFoundException when no public dataset matches", async () => {
      datasetsService.findOneComplete.mockResolvedValue(null);

      await expect(
        controller.findByIdPublic("pid-missing", undefined!),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
