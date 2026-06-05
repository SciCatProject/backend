import {
  Controller,
  Get,
  HttpStatus,
  Req,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { MetadataKeysService } from "./metadatakeys.service";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { OutputMetadataKeyDto } from "./dto/output-metadata-key.dto";

import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Request } from "express";
import { getSwaggerMetadatakeysFilterContent } from "./types/metadatakeys-filter-content";
import { MetadataKeyClass } from "./schemas/metadatakey.schema";
import { Action } from "src/casl/action.enum";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { FilterValidationPipe } from "src/common/pipes/filter-validation.pipe";
import {
  ALLOWED_METADATAKEYS_FILTER_KEYS,
  ALLOWED_METADATAKEYS_KEYS,
} from "./types/metadatakeys-lookup";
import { accessibleBy } from "@casl/mongoose";

@ApiBearerAuth()
@ApiTags("metadata keys v4")
@Controller({ path: "metadatakeys", version: "4" })
export class MetadataKeysV4Controller {
  constructor(
    private metadatakeysService: MetadataKeysService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  @UseGuards(PoliciesGuard)
  @CheckPolicies("metadataKeys", (ability: AppAbility) =>
    ability.can(Action.MetadataKeysReadEndpoint, MetadataKeyClass),
  )
  @Get()
  @ApiOperation({ summary: "List metadata keys by text query" })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieving metadata keys",
    required: false,
    type: String,
    content: getSwaggerMetadatakeysFilterContent(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputMetadataKeyDto,
    isArray: true,
    description: "Return the metadata keys requested",
  })
  async findAll(
    @Req() request: Request,
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_METADATAKEYS_KEYS,
        ALLOWED_METADATAKEYS_FILTER_KEYS,
        {
          where: true,
          include: false,
          fields: true,
          limits: true,
        },
      ),
    )
    filter: string,
  ) {
    const user: JWTUser = request.user as JWTUser;
    const parsedFilter = JSON.parse(filter ?? "{}");
    const abilities = this.caslAbilityFactory.metadataKeyInstanceAccess(user);
    const accessFilter = accessibleBy(
      abilities,
      Action.MetadataKeysReadInstance,
    ).ofType(MetadataKeyClass);

    return this.metadatakeysService.findAll(parsedFilter, accessFilter);
  }
}
