import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { FilterQuery } from "mongoose";
import { JWTUser } from "../auth/interfaces/jwt-user.interface";
import { Action } from "../casl/action.enum";
import { AppAbility, CaslAbilityFactory } from "../casl/casl-ability.factory";
import { CheckPolicies } from "../casl/decorators/check-policies.decorator";
import { AuthenticatedPoliciesGuard } from "../casl/guards/auth-check.guard";
import {
  GenericHistory,
  GenericHistoryDocument,
} from "../common/schemas/generic-history.schema";
import { HistoryService } from "./history.service";
import { Attachment } from "src/attachments/schemas/attachment.schema";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { Instrument } from "src/instruments/schemas/instrument.schema";
import { Policy } from "src/policies/schemas/policy.schema";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { PublishedData } from "src/published-data/schemas/published-data.schema";
import { SampleClass } from "src/samples/schemas/sample.schema";

@ApiBearerAuth()
@ApiTags("history")
@Controller("history")
export class HistoryController {
  constructor(
    private readonly historyService: HistoryService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  /**
   * Maps history subsystem names to their corresponding CASL action permissions
   * @private
   */
  private readonly subsystemSubjectMap = {
    Attachment: Attachment,
    Datablock: Datablock,
    Dataset: DatasetClass,
    Instrument: Instrument,
    Policy: Policy,
    Proposal: ProposalClass,
    PublishedData: PublishedData,
    Sample: SampleClass,
  };

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("history", (ability: AppAbility) =>
    ability.can(Action.HistoryRead, GenericHistory),
  )
  @Get()
  @ApiOperation({
    summary: "Find history records with flexible filtering",
    description:
      "Returns history records that match the provided filter criteria.",
  })
  @ApiQuery({
    name: "filter",
    description: "JSON filter object for querying history records",
    type: String,
    required: true,
    example: '{"subsystem":"Dataset","documentId":"12345"}',
  })
  @ApiQuery({
    name: "skip",
    description: "Number of records to skip (for pagination)",
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: "limit",
    description: "Number of records to return (for pagination)",
    type: Number,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "History records retrieved successfully",
  })
  async findHistory(
    @Req() request: Request,
    @Query("filter") filter: string,
    @Query("skip") skip?: number,
    @Query("limit") limit?: number,
  ) {
    // Parse the filter JSON
    let parsedFilter: FilterQuery<GenericHistoryDocument>;
    try {
      parsedFilter = JSON.parse(filter);
    } catch (error) {
      throw new BadRequestException("Invalid filter JSON format: " + error);
    }

    // Get the user's instance-level permissions
    const ability = this.caslAbilityFactory.historyAccess(
      request.user as JWTUser,
    );
    const canViewAny = ability.can(Action.AccessAny, GenericHistory);

    if (!canViewAny) {
      if (!parsedFilter.subsystem) {
        throw new BadRequestException(
          "subsystem is required in filter for permission verification",
        );
      }

      const subject =
        this.subsystemSubjectMap[
          parsedFilter.subsystem as keyof typeof this.subsystemSubjectMap
        ];

      if (!subject) {
        throw new BadRequestException(
          `${parsedFilter.subsystem} is not a valid history collection`,
        );
      } else if (!ability.can(Action.HistoryRead, subject)) {
        throw new ForbiddenException(
          `You don't have permission to access history for ${parsedFilter.subsystem} collection`,
        );
      }
    }

    // Apply the filters and pagination
    const [items, totalCount] = await Promise.all([
      this.historyService.find(parsedFilter, {
        skip: skip ? Number(skip) : undefined,
        limit: limit ? Number(limit) : undefined,
      }),
      this.historyService.count(parsedFilter),
    ]);

    return {
      items,
      count: items.length,
      totalCount,
      skip: skip ? Number(skip) : 0,
      limit: limit ? Number(limit) : 100,
    };
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("history", (ability: AppAbility) =>
    ability.can(Action.HistoryRead, GenericHistory),
  )
  @Get("count")
  @ApiOperation({
    summary: "Count history records with flexible filtering",
    description:
      "Returns the count of history records that match the provided filter criteria.",
  })
  @ApiQuery({
    name: "filter",
    description: "JSON filter object for counting history records",
    type: String,
    required: true,
    example: '{"subsystem":"Dataset","operation":"delete"}',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "History count retrieved successfully",
  })
  async countHistory(@Req() request: Request, @Query("filter") filter: string) {
    // Parse the filter JSON
    let parsedFilter: FilterQuery<GenericHistoryDocument>;
    try {
      parsedFilter = JSON.parse(filter);
    } catch (error) {
      throw new BadRequestException("Invalid filter JSON format: " + error);
    }

    // Ensure subsystem is provided for permission check
    if (!parsedFilter.subsystem) {
      throw new BadRequestException(
        "subsystem is required in filter for permission verification",
      );
    }

    // Get the user's instance-level permissions
    const ability = this.caslAbilityFactory.historyAccess(
      request.user as JWTUser,
    );

    const subject =
      this.subsystemSubjectMap[
        parsedFilter.subsystem as keyof typeof this.subsystemSubjectMap
      ];

    if (!subject || !ability.can(Action.HistoryRead, subject)) {
      throw new ForbiddenException(
        `You don't have permission to access history for ${parsedFilter.subsystem} collection`,
      );
    }

    const count = await this.historyService.count(parsedFilter);

    return { count };
  }

  // Keep the existing endpoint for backward compatibility
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("history", (ability: AppAbility) =>
    ability.can(Action.HistoryRead, GenericHistory),
  )
  @Get("collection/:subsystem")
  @ApiOperation({
    summary: "Get history by collection name",
    description:
      "Returns history records for a specific collection. Admin access only.",
  })
  @ApiParam({
    name: "subsystem",
    description: "The name of the collection to get history for",
    type: String,
    required: true,
  })
  @ApiQuery({
    name: "skip",
    description: "Number of records to skip (for pagination)",
    type: Number,
    required: false,
  })
  @ApiQuery({
    name: "limit",
    description: "Number of records to return (for pagination)",
    type: Number,
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "History records retrieved successfully",
  })
  async getHistoryByCollection(
    @Param("subsystem") subsystem: string,
    @Req() request: Request,
    @Query("skip") skip?: number,
    @Query("limit") limit?: number,
  ) {
    // Get the user's instance-level permissions
    const ability = this.caslAbilityFactory.historyAccess(
      request.user as JWTUser,
    );

    // Check permissions using the correct third parameter format based on your CASL setup
    const subject =
      this.subsystemSubjectMap[
        subsystem as keyof typeof this.subsystemSubjectMap
      ];

    if (!subject || !ability.can(Action.HistoryRead, subject)) {
      throw new ForbiddenException(
        `You don't have permission to access history for ${subsystem} collection`,
      );
    }

    const [items, totalCount] = await Promise.all([
      this.historyService.findBySubsystem(subsystem, {
        skip: skip ? Number(skip) : undefined,
        limit: limit ? Number(limit) : undefined,
      }),
      this.historyService.countBySubsystem(subsystem),
    ]);

    return {
      items,
      count: items.length,
      totalCount,
      skip: skip ? Number(skip) : 0,
      limit: limit ? Number(limit) : 100,
    };
  }
}
