import { Test, TestingModule } from "@nestjs/testing";
import { AttachmentsV4Controller } from "./attachments.v4.controller";
import { AttachmentsV4Service } from "./attachments.v4.service";
import {
  HttpException,
  HttpStatus,
  PreconditionFailedException,
} from "@nestjs/common";
import { PartialUpdateAttachmentV4Dto } from "./dto/update-attachment.v4.dto";
import { Attachment } from "./schemas/attachment.schema";
import * as jmp from "json-merge-patch";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { Request } from "express";

describe("AttachmentsController - findOneAndUpdate", () => {
  let controller: AttachmentsV4Controller;
  let service: AttachmentsV4Service;

  const mockAttachment: Attachment = {
    _id: "123",
    aid: "aid-123",
    ownerGroup: "group1",
    accessGroups: ["group1"],
    isPublished: false,
    thumbnail: "Test Attachment",
    caption: "Test Caption",
    createdBy: "user1",
    updatedBy: "user1",
    createdAt: new Date("2025-08-01T10:00:00Z"),
    updatedAt: new Date("2025-09-01T10:00:00Z"),
    // other fields...
  };

  const mockUpdatedAttachment = {
    ...mockAttachment,
    caption: "Updated",
  };

  const mockCaslAbilityFactory = {
    createForUser: jest.fn().mockReturnValue({
      can: jest.fn().mockReturnValue(true), // or false depending on test
    }),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn(controller as any, "checkPermissionsForAttachment")
      .mockResolvedValue(mockAttachment);
  });

  it("should update attachment with application/json", async () => {
    const dto: PartialUpdateAttachmentV4Dto = { caption: "Updated" };

    const req = {
      headers: { "content-type": "application/json" },
    } as Partial<Request> as Request;
    const result = await controller.findOneAndUpdate(req, "123", dto);

    expect(result).toEqual(mockUpdatedAttachment);
    expect(service.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "123" },
      dto,
      undefined,
    );
  });

  it("should update attachment with application/merge-patch+json", async () => {
    const dto = { caption: "Updated" };
    const req = {
      headers: { "content-type": "application/merge-patch+json" },
    } as Partial<Request> as Request;

    await controller.findOneAndUpdate(req, "123", dto);

    const expectedPatched = jmp.apply(mockAttachment, dto);
    expect(service.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "123" },
      expectedPatched,
      undefined,
    );
  });

  it("should throw PRECONDITION_FAILED if attachments service throws it", async () => {
    const dto = { caption: "Should Fail" };

    const req = {
      headers: {
        "content-type": "application/json",
        "if-unmodified-since": "2000-01-01T00:00:00Z",
      },
    } as Partial<Request> as Request;

    jest.spyOn(service, "findOneAndUpdate").mockImplementation(() => {
      throw new PreconditionFailedException(
        "Resource has been modified on server",
      );
    });

    await expect(controller.findOneAndUpdate(req, "123", dto)).rejects.toThrow(
      new HttpException(
        "Resource has been modified on server",
        HttpStatus.PRECONDITION_FAILED,
      ),
    );
    expect(service.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "123" },
      expect.any(Object),
      new Date("2000-01-01T00:00:00Z"),
    );
  });
});
