import {
  Controller,
  Get,
  Param,
  UseGuards,
  Body,
  Req,
  Post,
  Delete,
  Query,
  HttpStatus,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
  Patch,
  Put,
  HttpCode,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import * as jmp from "json-merge-patch";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Attachment, AttachmentDocument } from "./schemas/attachment.schema";
import { Action } from "src/casl/action.enum";
import {
  IAttachmentFields,
  IAttachmentFiltersV4,
} from "./interfaces/attachment-filters.interface";
import { getSwaggerAttachmentFilterContent } from "./types/attachment-filter-contents";
import { FilterValidationPipe } from "src/common/pipes/filter-validation.pipe";
import { CreateAttachmentV4Dto } from "./dto/create-attachment.v4.dto";
import { OutputAttachmentV4Dto } from "./dto/output-attachment.v4.dto";
import {
  PartialUpdateAttachmentV4Dto,
  UpdateAttachmentV4Dto,
} from "./dto/update-attachment.v4.dto";
import { AttachmentsV4Service as AttachmentsService } from "./attachments.v4.service";
import { AllowAny } from "src/auth/decorators/allow-any.decorator";
import { validate, ValidatorOptions } from "class-validator";
import { plainToInstance } from "class-transformer";
import { IsValidResponse } from "src/common/types";
import {
  ALLOWED_ATTACHMENT_KEYS,
  ALLOWED_ATTACHMENT_FILTER_KEYS,
} from "./types/attachment-lookup";
import { AttachmentRelationshipClass } from "./schemas/relationship.schema";
import { AttachmentRelationTargetType } from "./types/relationship-filter.enum";
import { parseDate } from "src/common/utils";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { DatasetsService } from "src/datasets/datasets.service";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { ProposalsService } from "src/proposals/proposals.service";
import { PublishedDataService } from "src/published-data/published-data.service";
import { SamplesService } from "src/samples/samples.service";

@ApiBearerAuth()
@ApiExtraModels(AttachmentRelationshipClass)
@ApiTags("attachments v4")
/* NOTE: Generated SDK method names include "V4" twice:
 *  - From the controller class name (AttachmentsV4Controller)
 *  - From the route version (`version: '4'`)
 * This is intentional for versioned routing.
 */
@Controller({ path: "attachments", version: "4" })
export class AttachmentsV4Controller {
  constructor(
    private caslAbilityFactory: CaslAbilityFactory,
    private attachmentsService: AttachmentsService,
    private datasetsService: DatasetsService,
    private proposalService: ProposalsService,
    private publishedDataService: PublishedDataService,
    private sampleService: SamplesService,
  ) {}

  private addPublicFilter(
    filter: IAttachmentFiltersV4<AttachmentDocument, IAttachmentFields>,
  ) {
    filter.where = { ...(filter.where ?? {}), isPublished: true };
    return filter;
  }

  private generateAttachmentInstanceForPermissions(
    attachment: Attachment | CreateAttachmentV4Dto,
  ): Attachment {
    const attachmentInstance = new Attachment();
    attachmentInstance.aid = attachment.aid || "";
    attachmentInstance.ownerGroup = attachment.ownerGroup || "";
    attachmentInstance.accessGroups = attachment.accessGroups || [];
    attachmentInstance.isPublished = attachment.isPublished || false;

    return attachmentInstance;
  }

  private generateDatasetInstanceForPermissions(
    dataset: DatasetClass,
  ): DatasetClass {
    const datasetInstance = new DatasetClass();
    // Drop the actual pid to avoid issues with createDataset vs. createDatasetWithPid
    datasetInstance.pid = "";
    datasetInstance.ownerGroup = dataset.ownerGroup || "";
    datasetInstance.accessGroups = dataset.accessGroups || [];
    datasetInstance.isPublished = dataset.isPublished || false;

    return datasetInstance;
  }

  private generateProposalInstanceForPermissions(
    proposal: ProposalClass,
  ): ProposalClass {
    const proposalInstance = new ProposalClass();
    proposalInstance.proposalId = proposal.proposalId || "";
    proposalInstance.ownerGroup = proposal.ownerGroup || "";
    proposalInstance.accessGroups = proposal.accessGroups || [];
    proposalInstance.isPublished = proposal.isPublished || false;

    return proposalInstance;
  }

  private permissionChecker(
    user: JWTUser,
    group: Action,
    attachment: Attachment | CreateAttachmentV4Dto | null,
  ) {
    if (!attachment) {
      return false;
    }

    const attachmentInstance =
      this.generateAttachmentInstanceForPermissions(attachment);
    const ability = this.caslAbilityFactory.attachmentAccess(user);

    try {
      switch (group) {
        case Action.Create:
          return ability.can(Action.Create, attachmentInstance);
        case Action.Read:
          return ability.can(Action.Read, attachmentInstance);
        case Action.Update:
          return ability.can(Action.Update, attachmentInstance);
        case Action.Delete:
          return ability.can(Action.Delete, attachmentInstance);
        default:
          throw new InternalServerErrorException(
            "Permission for the action is not specified",
          );
      }
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  private async relationChecker(
    user: JWTUser,
    group: Action,
    relations: AttachmentRelationshipClass[],
  ) {
    if (group === Action.Read) {
      return;
    }
    for (const relation of relations) {
      let ability;
      switch (relation.targetType) {
        case AttachmentRelationTargetType.Dataset:
          const dataset = await this.datasetsService.findOne({
            where: { pid: relation.targetId },
          });
          if (!dataset) {
            throw new NotFoundException(
              `Dataset ${relation.targetId} not found for linking an attachment`,
            );
          }
          ability = this.caslAbilityFactory.datasetAccess(user);
          const ds = this.generateDatasetInstanceForPermissions(dataset);
          if (group !== Action.Delete && !ability.can(group, ds)) {
            throw new ForbiddenException(
              `Unauthorized to ${group} an attachment to dataset ${relation.targetId}`,
            );
          } else if (
            group === Action.Delete &&
            !ability.can(group, ds) &&
            !ability.can(Action.Update, ds)
          ) {
            throw new ForbiddenException(
              `Unauthorized to ${group} an attachment to dataset ${relation.targetId}`,
            );
          }
          return;

        case AttachmentRelationTargetType.Proposal:
          const proposal = await this.proposalService.findOne({
            where: { proposalId: relation.targetId },
          });
          if (!proposal) {
            throw new NotFoundException(
              `Proposal ${relation.targetId} not found for linking an attachment`,
            );
          }
          ability = this.caslAbilityFactory.proposalAccess(user);
          const pr = this.generateProposalInstanceForPermissions(proposal);
          if (group !== Action.Delete && !ability.can(group, pr)) {
            throw new ForbiddenException(
              `Unauthorized to ${group} an attachment to proposal ${relation.targetId}`,
            );
          } else if (
            group === Action.Delete &&
            !ability.can(group, pr) &&
            !ability.can(Action.Update, pr)
          ) {
            throw new ForbiddenException(
              `Unauthorized to ${group} an attachment to proposal ${relation.targetId}`,
            );
          }
          return;

        case AttachmentRelationTargetType.PublishedData:
          const publishedData = await this.publishedDataService.findOne({
            where: { doi: relation.targetId },
          });
          if (!publishedData) {
            throw new NotFoundException(
              `PublishedData ${relation.targetId} not found for linking an attachment`,
            );
          }
          return;

        case AttachmentRelationTargetType.Sample:
          const sample = await this.sampleService.findOne({
            where: { sampleId: relation.targetId },
          });
          if (!sample) {
            throw new NotFoundException(
              `Sample ${relation.targetId} not found for linking an attachment`,
            );
          }
          return;
      }
    }
    return;
  }

  private addAccessBasedFilters(
    user: JWTUser,
    filter: IAttachmentFiltersV4<AttachmentDocument, IAttachmentFields>,
  ): IAttachmentFiltersV4<AttachmentDocument, IAttachmentFields> {
    const ability = this.caslAbilityFactory.attachmentAccess(user);
    const canViewAny = ability.can(Action.AccessAny, Attachment);
    const canView = ability.can(Action.Read, Attachment);

    filter.where = filter.where ?? {};

    if (!user) {
      filter.where["$and"] = filter.where["$and"] ?? [];
      filter.where["$and"].push({
        isPublished: true,
      });
    } else if (!canViewAny && canView) {
      filter.where["$and"] = filter.where["$and"] ?? [];
      filter.where["$and"].push({
        $or: [
          { ownerGroup: { $in: user.currentGroups } },
          { accessGroups: { $in: user.currentGroups } },
          { sharedWith: { $in: [user.email] } },
          { isPublished: true },
        ],
      });
    }
    return filter;
  }

  private async checkPermissionsForAttachment(
    user: JWTUser,
    group: Action,
    id: string,
  ) {
    const attachment = await this.attachmentsService.findOne({
      _id: id,
    });
    if (!attachment) {
      throw new NotFoundException(`Attachment: ${id} not found`);
    }

    const canDoAction = this.permissionChecker(user, group, attachment);
    if (!canDoAction) {
      throw new ForbiddenException("Unauthorized to this attachment");
    }

    await this.relationChecker(user, group, attachment.relationships ?? []);

    return attachment;
  }

  private async checkPermissionsForAttachmentCreate(
    user: JWTUser,
    group: Action,
    attachment: CreateAttachmentV4Dto,
  ) {
    const canDoAction = this.permissionChecker(user, group, attachment);
    if (!canDoAction) {
      throw new ForbiddenException("Unauthorized to create this attachment");
    }

    await this.relationChecker(user, group, attachment.relationships ?? []);

    return attachment;
  }

  // GET /attachments
  @UseGuards(PoliciesGuard)
  @CheckPolicies("attachments", (ability: AppAbility) =>
    ability.can(Action.Read, Attachment),
  )
  @ApiOperation({
    summary: "It returns a list of attachments.",
    description:
      "It returns a list of attachments. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieving attachments",
    required: false,
    type: String,
    content: getSwaggerAttachmentFilterContent(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputAttachmentV4Dto,
    isArray: true,
    description: "Return the attachments requested",
  })
  @Get()
  findAll(
    @Req() request: Request,
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_ATTACHMENT_KEYS,
        ALLOWED_ATTACHMENT_FILTER_KEYS,
        {
          where: true,
          include: false,
          fields: true,
          limits: true,
        },
      ),
    )
    queryFilter: string,
  ): Promise<OutputAttachmentV4Dto[]> {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");
    const mergedFilters = this.addAccessBasedFilters(
      request.user as JWTUser,
      parsedFilter,
    );

    return this.attachmentsService.findAll(mergedFilters);
  }

  // GET /attachments/public
  @AllowAny()
  @ApiOperation({
    summary: "It returns a list of attachments.",
    description:
      "It returns a list of public attachments. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieving public attachments",
    required: false,
    type: String,
    content: getSwaggerAttachmentFilterContent(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputAttachmentV4Dto,
    isArray: true,
    description: "Return the attachments requested",
  })
  @Get("/public")
  findAllPublic(
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_ATTACHMENT_KEYS,
        ALLOWED_ATTACHMENT_FILTER_KEYS,
        {
          where: true,
          include: false,
          fields: true,
          limits: true,
        },
      ),
    )
    queryFilter: string,
  ): Promise<OutputAttachmentV4Dto[]> {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");
    const mergedFilter = this.addPublicFilter(parsedFilter);

    const attachments = this.attachmentsService.findAll(mergedFilter);
    return attachments;
  }

  // GET /attachments/:aid
  @UseGuards(PoliciesGuard)
  @CheckPolicies("attachments", (ability: AppAbility) =>
    ability.can(Action.Read, Attachment),
  )
  @ApiOperation({
    summary: "It returns the attachment requested.",
    description:
      "It returns the attachment requested through the id specified.",
  })
  @ApiParam({
    name: "aid",
    description: "Id of the attachment to return",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputAttachmentV4Dto,
    description: "Return attachment with id specified",
  })
  @Get("/:aid")
  async findOne(
    @Req() request: Request,
    @Param("aid") aid: string,
  ): Promise<OutputAttachmentV4Dto | null> {
    const user: JWTUser = request.user as JWTUser;
    await this.checkPermissionsForAttachment(user, Action.Read, aid);
    return this.attachmentsService.findOne({ aid });
  }

  // PATCH /attachments/:aid
  @UseGuards(PoliciesGuard)
  @CheckPolicies("attachments", (ability: AppAbility) =>
    ability.can(Action.Update, Attachment),
  )
  @ApiOperation({
    summary: "It updates the attachment.",
    description: `It updates the attachment through the aid specified. It updates only the specified fields.
Set \`content-type\` header to \`application/merge-patch+json\` if you would like to update nested objects.

- In \`application/json\`, setting a property to \`null\` means "do not change this value."
- In \`application/merge-patch+json\`, setting a property to \`null\` means "reset this value to \`null\`" (or the default value, if one is defined).

    **Warning:** \`application/merge-patch+json\` doesn't support updating a specific item in an array — the result will always replace the entire target if it's not an object.`,
  })
  @ApiParam({
    name: "aid",
    description: "Id of the attachment to modify",
    type: String,
  })
  @ApiConsumes("application/json", "application/merge-patch+json")
  @ApiBody({
    type: PartialUpdateAttachmentV4Dto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Attachment,
    description:
      "Update an existing attachment and return its representation in SciCat",
  })
  @Patch("/:aid")
  async findOneAndUpdate(
    @Req() request: Request,
    @Param("aid") aid: string,
    @Body() updateAttachmentDto: PartialUpdateAttachmentV4Dto,
  ): Promise<OutputAttachmentV4Dto | null> {
    const user: JWTUser = request.user as JWTUser;
    const foundAttachment = await this.checkPermissionsForAttachment(
      user,
      Action.Update,
      aid,
    );
    const updateAttachmentDtoForService =
      request.headers["content-type"] === "application/merge-patch+json"
        ? jmp.apply(foundAttachment, updateAttachmentDto)
        : updateAttachmentDto;

    const unmodifiedSince = parseDate(request.headers["if-unmodified-since"]);
    return this.attachmentsService.findOneAndUpdate(
      { _id: aid },
      updateAttachmentDtoForService,
      unmodifiedSince,
    );
  }

  // PUT /attachments/:aid
  @UseGuards(PoliciesGuard)
  @CheckPolicies("attachments", (ability: AppAbility) =>
    ability.can(Action.Update, Attachment),
  )
  @ApiOperation({
    summary: "It updates the attachment.",
    description: `It updates the attachment specified through the id specified. If optional fields are not provided they will be removed.
      The PUT method is responsible for modifying an existing entity. The crucial part about it is that it is supposed to replace an entity.
      Therefore, if we don’t send a field of an entity when performing a PUT request, the missing field should be removed from the document.
      (Caution: This operation could result with data loss if all the attachment fields are not provided)`,
  })
  @ApiParam({
    name: "aid",
    description: "ID of the attachment to modify",
    type: String,
  })
  @ApiBody({
    type: UpdateAttachmentV4Dto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Attachment,
    description:
      "Update an existing attachment. The whole attachment object with updated fields have to be passed in.",
  })
  @Put("/:aid")
  async findOneAndReplace(
    @Req() request: Request,
    @Param("aid") aid: string,
    @Body() updateAttachmentDto: UpdateAttachmentV4Dto,
  ): Promise<OutputAttachmentV4Dto | null> {
    const user: JWTUser = request.user as JWTUser;
    await this.checkPermissionsForAttachment(user, Action.Update, aid);
    return this.attachmentsService.findOneAndReplace(
      { _id: aid },
      updateAttachmentDto,
    );
  }

  // POST /attachments
  @UseGuards(PoliciesGuard)
  @CheckPolicies("attachments", (ability: AppAbility) =>
    ability.can(Action.Create, Attachment),
  )
  @ApiOperation({
    summary: "It creates a new attachment.",
    description:
      "It creates a new attachment and returns it completed with systems fields.",
  })
  @ApiBody({
    type: CreateAttachmentV4Dto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: Attachment,
    description:
      "Create a new attachment and return its representation in SciCat",
  })
  @Post()
  async createAttachment(
    @Req() request: Request,
    @Body() createAttachmentDto: CreateAttachmentV4Dto,
  ): Promise<OutputAttachmentV4Dto> {
    const user: JWTUser = request.user as JWTUser;
    await this.checkPermissionsForAttachmentCreate(
      user,
      Action.Create,
      createAttachmentDto,
    );
    return this.attachmentsService.create(createAttachmentDto);
  }

  // POST /attachments/isValid
  @UseGuards(PoliciesGuard)
  @CheckPolicies("attachments", (ability: AppAbility) =>
    ability.can(Action.Create, Attachment),
  )
  @Post("/isValid")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "It validates the attachment provided as input.",
    description:
      "It validates the attachment provided as input, and returns true if the information is a valid attachment",
  })
  @ApiBody({
    type: CreateAttachmentV4Dto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: IsValidResponse,
    description:
      "Check if the attachment provided pass validation. It return true if the validation is passed",
  })
  async isValid(
    @Req() request: Request,
    @Body() createAttachmentDto: object,
  ): Promise<IsValidResponse> {
    const validatorOptions: ValidatorOptions = {
      whitelist: true,
      forbidNonWhitelisted: true,
    };
    const CreateAttachmentDtoInstance = plainToInstance(
      CreateAttachmentV4Dto,
      createAttachmentDto,
    );

    const user: JWTUser = request.user as JWTUser;

    await this.checkPermissionsForAttachmentCreate(
      user,
      Action.Create,
      CreateAttachmentDtoInstance,
    );

    const errorsAttachment = await validate(
      CreateAttachmentDtoInstance,
      validatorOptions,
    );

    const valid = errorsAttachment.length == 0;

    return { valid: valid, reason: errorsAttachment };
  }

  // DELETE /attachments/:aid
  @UseGuards(PoliciesGuard)
  @CheckPolicies("attachments", (ability: AppAbility) =>
    ability.can(Action.Delete, Attachment),
  )
  @ApiOperation({
    summary: "It deletes the attachment.",
    description: "It delete the attachment specified through the id specified.",
  })
  @ApiParam({
    name: "aid",
    description: "Id of the attachment to delete",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "No value is returned",
  })
  @Delete("/:aid")
  async findOneAttachmentAndRemove(
    @Req() request: Request,
    @Param("aid") aid: string,
  ): Promise<unknown> {
    const user: JWTUser = request.user as JWTUser;
    await this.checkPermissionsForAttachment(user, Action.Delete, aid);
    return this.attachmentsService.findOneAndDelete({ aid });
  }
}
