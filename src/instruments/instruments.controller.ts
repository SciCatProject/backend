import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  InternalServerErrorException,
  ConflictException,
  Headers,
  NotFoundException,
} from "@nestjs/common";
import { MongoError } from "mongodb";
import { InstrumentsService } from "./instruments.service";
import { CreateInstrumentDto } from "./dto/create-instrument.dto";
import { PartialUpdateInstrumentDto } from "./dto/update-instrument.dto";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { AppAbility } from "src/casl/casl-ability.factory";
import { Action } from "src/casl/action.enum";
import { Instrument, InstrumentDocument } from "./schemas/instrument.schema";
import { FormatPhysicalQuantitiesInterceptor } from "src/common/interceptors/format-physical-quantities.interceptor";
import { IFilters } from "src/common/interfaces/common.interface";
import { filterDescription, filterExample } from "src/common/utils";
import { CountApiResponse } from "src/common/types";
import { checkUnmodifiedSince } from "src/common/utils/check-unmodified-since";
import { FilterPipe } from "src/common/pipes/filter.pipe";

@ApiBearerAuth()
@ApiTags("instruments")
@Controller("instruments")
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @UseGuards(PoliciesGuard)
  @CheckPolicies("instruments", (ability: AppAbility) =>
    ability.can(Action.InstrumentCreate, Instrument),
  )
  @UseInterceptors(
    new FormatPhysicalQuantitiesInterceptor<Instrument>("customMetadata"),
  )
  @Post()
  async create(
    @Body() createInstrumentDto: CreateInstrumentDto,
  ): Promise<Instrument> {
    try {
      const instrument =
        await this.instrumentsService.create(createInstrumentDto);
      return instrument;
    } catch (error) {
      if ((error as MongoError).code === 11000) {
        throw new ConflictException(
          "Instrument with the same unique name or PID already exists",
        );
      } else {
        throw new InternalServerErrorException(
          "Something went wrong. Please try again later.",
          { cause: error },
        );
      }
    }
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("instruments", (ability: AppAbility) =>
    ability.can(Action.InstrumentRead, Instrument),
  )
  @Get()
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieve all instruments",
    required: false,
  })
  async findAll(
    @Query("filter", new FilterPipe()) filter?: IFilters<InstrumentDocument>,
  ): Promise<Instrument[]> {
    const instrumentFilter: IFilters<InstrumentDocument> = filter ?? {};
    return this.instrumentsService.findAll(instrumentFilter);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("instruments", (ability: AppAbility) =>
    ability.can(Action.InstrumentRead, Instrument),
  )
  @Get("/count")
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieve instrument count",
    required: false,
  })
  async count(
    @Query("filter", new FilterPipe()) filter?: IFilters<InstrumentDocument>,
  ): Promise<CountApiResponse> {
    const instrumentFilter: IFilters<InstrumentDocument> = filter ?? {};
    return this.instrumentsService.count(instrumentFilter);
  }

  // GET /instrument/findOne
  @UseGuards(PoliciesGuard)
  @CheckPolicies("instruments", (ability: AppAbility) =>
    ability.can(Action.InstrumentRead, Instrument),
  )
  @Get("/findOne")
  @ApiOperation({
    summary: "It returns the first instrument found.",
    description:
      "It returns the first instrument of the ones that matches the filter provided. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving instruments\n" +
      filterDescription,
    required: false,
    type: String,
    example: filterExample,
  })
  @ApiResponse({
    status: 200,
    type: Instrument,
    description: "Return the instrument requested",
  })
  async findOne(
    @Query("filter", new FilterPipe()) filter?: IFilters<InstrumentDocument>,
  ): Promise<Instrument | null> {
    const instrumentFilters = filter ?? {};

    return this.instrumentsService.findOne(instrumentFilters);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("instruments", (ability: AppAbility) =>
    ability.can(Action.InstrumentRead, Instrument),
  )
  @Get(":id")
  async findById(@Param("id") pid: string): Promise<Instrument | null> {
    return this.instrumentsService.findOne({ where: { _id: pid } });
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("instruments", (ability: AppAbility) =>
    ability.can(Action.InstrumentUpdate, Instrument),
  )
  @UseInterceptors(
    new FormatPhysicalQuantitiesInterceptor<Instrument>("customMetadata"),
  )
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updateInstrumentDto: PartialUpdateInstrumentDto,
    @Headers() headers: Record<string, string>,
  ): Promise<Instrument | null> {
    const instrument = await this.instrumentsService.findOne({
      where: { _id: id },
    });
    if (!instrument) throw new NotFoundException("Instrument not found");

    //checks if the resource is unmodified since clients timestamp
    checkUnmodifiedSince(instrument.updatedAt, headers["if-unmodified-since"]);

    try {
      const updatedInstrument = await this.instrumentsService.update(
        { _id: id },
        updateInstrumentDto,
      );

      return updatedInstrument;
    } catch (error) {
      if ((error as MongoError).code === 11000) {
        throw new ConflictException(
          "Instrument with the same unique name already exists",
        );
      } else {
        throw new InternalServerErrorException(
          "Something went wrong. Please try again later.",
          { cause: error },
        );
      }
    }
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("instruments", (ability: AppAbility) =>
    ability.can(Action.InstrumentDelete, Instrument),
  )
  @Delete(":id")
  async remove(@Param("id") id: string): Promise<unknown> {
    return this.instrumentsService.remove({ pid: id });
  }
}
