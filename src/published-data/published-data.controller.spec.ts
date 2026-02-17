import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AttachmentsService } from "src/attachments/attachments.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { DatasetsService } from "src/datasets/datasets.service";
import { ProposalsService } from "src/proposals/proposals.service";
import { PublishedDataController } from "./published-data.controller";
import { PublishedDataService } from "./published-data.service";

class AttachmentsServiceMock {}

class DatasetsServiceMock {}

class HttpServiceMock {}

class ProposalsServiceMock {}

class PublishedDataServiceMock {}

class CaslAbilityFactoryMock {}

describe("PublishedDataController", () => {
  let controller: PublishedDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublishedDataController],
      providers: [
        ConfigService,
        { provide: AttachmentsService, useClass: AttachmentsServiceMock },
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        { provide: HttpService, useClass: HttpServiceMock },
        { provide: ProposalsService, useClass: ProposalsServiceMock },
        { provide: PublishedDataService, useClass: PublishedDataServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = module.get<PublishedDataController>(PublishedDataController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
