import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AttachmentsService } from "src/attachments/attachments.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { DatasetsService } from "src/datasets/datasets.service";
import { ProposalsService } from "src/proposals/proposals.service";
import { PublishedDataController } from "./published-data.controller";
import { PublishedDataService } from "./published-data.service";
import { DatasetsV4Controller } from "src/datasets/datasets.v4.controller";

class AttachmentsServiceMock {}

class DatasetsServiceMock {}

class HttpServiceMock {}

class ProposalsServiceMock {}

class PublishedDataServiceMock {
  findOne = jest.fn();
  update = jest.fn();
}

class CaslAbilityFactoryMock {
  publishedDataAccess = jest.fn().mockReturnValue({
    cannot: () => false,
  });
}

class DatasetsV4ControllerMock {
  findByIdAndUpdate = jest.fn();
}

describe("PublishedDataController", () => {
  let controller: PublishedDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublishedDataController],
      providers: [
        ConfigService,
        { provide: AttachmentsService, useClass: AttachmentsServiceMock },
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        { provide: DatasetsV4Controller, useClass: DatasetsV4ControllerMock },
        { provide: HttpService, useClass: HttpServiceMock },
        { provide: ProposalsService, useClass: ProposalsServiceMock },
        { provide: PublishedDataService, useClass: PublishedDataServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = await module.resolve<PublishedDataController>(
      PublishedDataController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("registers a legacy record with null dataset pids without crashing", async () => {
    const publishedDataService = (
      controller as unknown as {
        publishedDataService: PublishedDataServiceMock;
      }
    ).publishedDataService;
    const datasetsController = (
      controller as unknown as {
        datasetsController: DatasetsV4ControllerMock;
      }
    ).datasetsController;
    const publishedData = {
      _id: "10.9999/example",
      doi: "10.9999/example",
      title: "Example",
      abstract: "Example abstract",
      datasetPids: null,
      proposalIds: ["proposal-1"],
      sampleIds: [],
      instrumentIds: [],
      metadata: {
        creators: [{ name: "Jane Doe" }],
        publisher: { name: "SciCat" },
        publicationYear: 2025,
        resourceType: "Dataset",
        affiliation: "ESS",
      },
    };

    publishedDataService.findOne.mockResolvedValue(publishedData);
    publishedDataService.update.mockResolvedValue(publishedData);

    const request = {
      user: { username: "test-user" },
      headers: {},
    } as never;

    await expect(
      controller.register(request, publishedData.doi),
    ).resolves.toEqual({ doi: publishedData.doi });
    expect(datasetsController.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
