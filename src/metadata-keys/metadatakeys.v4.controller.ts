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
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { EndpointGuard } from "src/casl/guards/endpoint.guard";
import { EndpointAccess } from "src/casl/decorators/endpoint-access.decorator";
import { AppAbility } from "src/casl/types/casl-subjects";
import { Action } from "src/casl/types/action.enum";
import { accessCheck } from "src/casl/utils/access-check.util";
import { MetadataKeysService } from "./metadatakeys.service";
import { OutputMetadataKeyDto } from "./dto/output-metadata-key.dto";
import { Request } from "express";
import { getSwaggerMetadatakeysFilterContent } from "./types/metadatakeys-filter-content";
import { MetadataKeyClass } from "./schemas/metadatakey.schema";
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

  @UseGuards(EndpointGuard)
  @EndpointAccess(
    accessCheck("metadataKeys", (ability: AppAbility) =>
      ability.can(Action.Read, MetadataKeyClass),
    ),
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
    const abilities = this.caslAbilityFactory.metadataKeyAccess(user);
    const accessFilter = accessibleBy(abilities, Action.Read).ofType(
      MetadataKeyClass,
    );

    return this.metadatakeysService.findAll(parsedFilter, accessFilter);
  }
}
