import { Controller, Get, Param, Query, HttpStatus } from "@nestjs/common";
import { OrigDatablocksService } from "./origdatablocks.service";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { OrigDatablockDocument } from "./schemas/origdatablock.schema";
import { OutputOrigDatablockDto } from "./dto/output-origdatablock.dto";
import { IFacets } from "src/common/interfaces/common.interface";
import {
  IOrigDatablockFields,
  IOrigDatablockFiltersV4,
} from "./interfaces/origdatablocks.interface";
import {
  FullFacetFilters,
  FullFacetResponse,
  CountApiResponse,
} from "src/common/types";
import { getSwaggerOrigDatablockFilterContent } from "./types/origdatablock-filter-content";
import {
  OrigDatablockLookupKeysEnum,
  ORIGDATABLOCK_LOOKUP_FIELDS,
  ALLOWED_ORIGDATABLOCK_KEYS,
  ALLOWED_ORIGDATABLOCK_FILTER_KEYS,
} from "./types/origdatablock-lookup";
import { IncludeValidationPipe } from "src/common/pipes/include-validation.pipe";
import { FilterValidationPipe } from "src/common/pipes/filter-validation.pipe";
import { AllowAny } from "src/auth/decorators/allow-any.decorator";

@ApiTags("origdatablocks public v4")
/* NOTE: Generated SDK method names include "V4" twice:
 *  - From the controller class name (OrigDatablocksPublicV4Controller)
 *  - From the route version (`version: '4'`)
 * This is intentional for versioned routing.
 */
@Controller({ path: "origdatablocks/public", version: "4" })
export class OrigDatablocksPublicV4Controller {
  constructor(private readonly origDatablocksService: OrigDatablocksService) {}

  addPublicFilter(
    filter: IOrigDatablockFiltersV4<
      OrigDatablockDocument,
      IOrigDatablockFields
    >,
  ) {
    if (!filter.where) {
      filter.where = {};
    }

    filter.where = { ...filter.where, isPublished: true };
  }

  // GET /origdatablocks/public
  @AllowAny()
  @Get()
  @ApiOperation({
    summary: "It returns a list of public origdatablocks.",
    description:
      "It returns a list of public original datablocks. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving the public origdatablocks",
    required: false,
    type: String,
    content: getSwaggerOrigDatablockFilterContent(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputOrigDatablockDto,
    isArray: true,
    description: "Return the origdatablocks requested",
  })
  async findAllPublic(
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_ORIGDATABLOCK_KEYS,
        ALLOWED_ORIGDATABLOCK_FILTER_KEYS,
      ),
      new IncludeValidationPipe(ORIGDATABLOCK_LOOKUP_FIELDS),
    )
    queryFilter: string,
  ) {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");

    this.addPublicFilter(parsedFilter);

    const origdatablocks =
      await this.origDatablocksService.findAllComplete(parsedFilter);

    return origdatablocks;
  }

  // GET /origdatablocks/public/files
  @AllowAny()
  @Get("/files")
  @ApiOperation({
    summary:
      "It returns a list of public origdatablocks, one for each datafile.",
    description:
      "It returns a list of public original datablocks, one for each datafile. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving the public origdatablocks",
    required: false,
    type: String,
    content: getSwaggerOrigDatablockFilterContent(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputOrigDatablockDto,
    isArray: true,
    description: "Return the origdatablocks requested",
  })
  async findAllFilesPublic(
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_ORIGDATABLOCK_KEYS,
        ALLOWED_ORIGDATABLOCK_FILTER_KEYS,
      ),
      new IncludeValidationPipe(ORIGDATABLOCK_LOOKUP_FIELDS),
    )
    queryFilter: string,
  ) {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");

    this.addPublicFilter(parsedFilter);

    const origdatablocks =
      await this.origDatablocksService.findAllFilesComplete(parsedFilter);

    return origdatablocks;
  }

  // GET /origdatablocks/public/fullfacet
  @AllowAny()
  @Get("/fullfacet")
  @ApiQuery({
    name: "filters",
    description:
      "Defines list of field names, for which facet counts should be calculated",
    required: false,
    type: FullFacetFilters,
    example:
      '{"facets": ["type","creationLocation","ownerGroup","keywords"], fields: {}}',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: FullFacetResponse,
    isArray: true,
    description: "Return fullfacet response for origdatablocks requested",
  })
  async fullfacet(
    @Query() filters: { fields?: string; facets?: string },
  ): Promise<Record<string, unknown>[]> {
    const fields: IOrigDatablockFields = JSON.parse(filters.fields ?? "{}");

    fields.isPublished = true;

    const parsedFilters: IFacets<IOrigDatablockFields> = {
      fields: fields,
      facets: JSON.parse(filters.facets ?? "[]"),
    };

    return this.origDatablocksService.fullfacet(parsedFilters);
  }

  // GET /origdatablocks/public/fullfacet/files
  @AllowAny()
  @Get("/fullfacet/files")
  @ApiQuery({
    name: "filters",
    description:
      "Defines list of field names, for which facet counts should be calculated",
    required: false,
    type: FullFacetFilters,
    example:
      '{"facets": ["type","creationLocation","ownerGroup","keywords"], fields: {}}',
  })
  async fullfacetFiles(
    @Query() filters: { fields?: string; facets?: string },
  ): Promise<Record<string, unknown>[]> {
    const fields: IOrigDatablockFields = JSON.parse(filters.fields ?? "{}");

    fields.isPublished = true;

    const parsedFilters = {
      fields: fields,
      limits: JSON.parse(filters.facets ?? "{}"),
    };
    const getSubFieldCount = "dataFileList";

    return this.origDatablocksService.fullfacet(
      parsedFilters,
      getSubFieldCount,
    );
  }

  // GET /origdatablocks/public/:id
  @AllowAny()
  @Get("/:id")
  @ApiParam({
    name: "id",
    description: "Id of the public origdatablock to return",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputOrigDatablockDto,
    isArray: false,
    description: "Return public origdatablock with pid specified",
  })
  @ApiQuery({
    name: "include",
    enum: OrigDatablockLookupKeysEnum,
    type: String,
    required: false,
    isArray: true,
  })
  async findByIdPublic(
    @Param("id") id: string,
    @Query("include", new IncludeValidationPipe(ORIGDATABLOCK_LOOKUP_FIELDS))
    include: OrigDatablockLookupKeysEnum[] | OrigDatablockLookupKeysEnum,
  ) {
    const includeArray = Array.isArray(include)
      ? include
      : include && Array(include);

    const origdatablock = await this.origDatablocksService.findOneComplete({
      where: { _id: id, isPublished: true },
      include: includeArray,
    });

    return origdatablock;
  }

  // GET /origdatablocks/public/files/count
  @AllowAny()
  @Get("/files/count")
  @ApiOperation({
    summary: "It returns the count of public files",
    description:
      "It returns the total number of public files across all origdatablocks matching the provided filter.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving count of public files",
    required: false,
    type: String,
    content: getSwaggerOrigDatablockFilterContent({
      where: true,
      include: false,
      fields: false,
      limits: false,
    }),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CountApiResponse,
    description:
      "Return the number of public files in the following format: { count: integer }",
  })
  async countFilesPublic(
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_ORIGDATABLOCK_KEYS,
        ALLOWED_ORIGDATABLOCK_FILTER_KEYS,
        {
          where: true,
          include: false,
          fields: false,
          limits: false,
        },
      ),
    )
    queryFilter?: string,
  ) {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");

    return this.origDatablocksService.countFiles(parsedFilter);
  }
}
