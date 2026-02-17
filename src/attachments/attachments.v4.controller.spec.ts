import { Test, TestingModule } from "@nestjs/testing";
import { AttachmentsV4Controller } from "./attachments.v4.controller";
import { AttachmentsV4Service } from "./attachments.v4.service";
import { HttpException, HttpStatus } from "@nestjs/common";
import { PartialUpdateAttachmentV4Dto } from "./dto/update-attachment.v4.dto";
import { Attachment } from "./schemas/attachment.schema";
import * as jmp from "json-merge-patch";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { PoliciesGuard } from "src/casl/guards/policies.guard";

describe("AttachmentsController - findOneAndUpdate", () => {
  let controller: AttachmentsV4Controller;
  let service: AttachmentsV4Service;

  const mockAttachment: Attachment = {
    _id: "123",
    name: "Test Attachment",
    description: "Initial",
    updatedAt: new Date("2025-09-01T10:00:00Z"),
    // other fields...
  };

  const mockUpdatedAttachment = {
    ...mockAttachment,
    description: "Updated",
  };

  const mockCaslAbilityFactory = {
    createForUser: jest.fn().mockReturnValue({
      can: jest.fn().mockReturnValue(true), // or false depending on test
    }),
  };

  const mockAttachmentsV4Service = {
    findOneAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttachmentsV4Controller],
      providers: [
        {
          provide: AttachmentsV4Service,
          useValue: {
            findOneAndUpdate: jest
              .fn()
              .mockResolvedValue(mockUpdatedAttachment),
          },
        },
        {
          provide: CaslAbilityFactory,
          useValue: mockCaslAbilityFactory,
        },
        PoliciesGuard,
      ],
    }).compile();

    controller = module.get<AttachmentsV4Controller>(AttachmentsV4Controller);
    service = module.get<AttachmentsV4Service>(AttachmentsV4Service);

    // Mock permission check
    jest
      .spyOn(controller, "checkPermissionsForAttachment")
      .mockResolvedValue(mockAttachment);
  });

  it("should update attachment with application/json", async () => {
    const dto: PartialUpdateAttachmentV4Dto = { description: "Updated" };
    const headers = { "content-type": "application/json" };

    const result = await controller.findOneAndUpdate({ headers }, "123", dto);

    expect(result).toEqual(mockUpdatedAttachment);
    expect(service.findOneAndUpdate).toHaveBeenCalledWith({ _id: "123" }, dto);
  });

  it("should update attachment with application/merge-patch+json", async () => {
    const dto = { description: null };
    const headers = { "content-type": "application/merge-patch+json" };

    await controller.findOneAndUpdate({ headers }, "123", dto);

    const expectedPatched = jmp.apply(mockAttachment, dto);
    expect(service.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "123" },
      expectedPatched,
    );
  });

  it("should throw PRECONDITION_FAILED if If-Unmodified-Since is older than updatedAt", async () => {
    const dto = { name: "Should Fail" };
    const headers = {
      "content-type": "application/json",
      "if-unmodified-since": "2000-01-01T00:00:00Z",
    };

    await expect(
      controller.findOneAndUpdate({ headers }, "123", dto),
    ).rejects.toThrow(
      new HttpException(
        "Resource has been modified on server",
        HttpStatus.PRECONDITION_FAILED,
      ),
    );
  });
});
