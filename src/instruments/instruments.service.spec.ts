import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
import { InstrumentsService } from "./instruments.service";
import { Instrument } from "./schemas/instrument.schema";

const mockInstrument: Instrument = {
  _id: "testPid",
  pid: "testPid",
  uniqueName: "Test",
  name: "Test",
  customMetadata: {},
  createdAt: new Date(),
  createdBy: "testUser",
  updatedAt: new Date(),
  updatedBy: "testUser",
};

describe("InstrumentsService", () => {
  let service: InstrumentsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let model: Model<Instrument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstrumentsService,
        {
          provide: getModelToken("Instrument"),
          useValue: {
            new: jest.fn().mockResolvedValue(mockInstrument),
            constructor: jest.fn().mockResolvedValue(mockInstrument),
            find: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    service = await module.resolve<InstrumentsService>(InstrumentsService);
    model = module.get<Model<Instrument>>(getModelToken("Instrument"));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
