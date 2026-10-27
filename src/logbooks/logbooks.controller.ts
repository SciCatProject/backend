import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  Query,
} from "@nestjs/common";
import { LogbooksService } from "./logbooks.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { EndpointGuard } from "src/casl/guards/endpoint.guard";
import { EndpointAccess } from "src/casl/decorators/endpoint-access.decorator";
import { AppAbility } from "src/casl/types/casl-subjects";
import { Action } from "src/casl/types/action.enum";
import { accessCheck } from "src/casl/utils/access-check.util";
import { Logbook } from "./schemas/logbook.schema";
import { UsersLogbooksInterceptor } from "./interceptors/users-logbooks.interceptor";

@ApiBearerAuth()
@ApiTags("logbooks")
@Controller("logbooks")
export class LogbooksController {
  constructor(private readonly logbooksService: LogbooksService) {}

  @UseGuards(EndpointGuard)
  @EndpointAccess(
    accessCheck("logbooks", (ability: AppAbility) =>
      ability.can(Action.Read, Logbook),
    ),
  )
  @UseInterceptors(UsersLogbooksInterceptor)
  @Get()
  findAll() {
    return this.logbooksService.findAll();
  }

  @UseGuards(EndpointGuard)
  @EndpointAccess(
    accessCheck("logbooks", (ability: AppAbility) =>
      ability.can(Action.Read, Logbook),
    ),
  )
  @UseInterceptors(UsersLogbooksInterceptor)
  @Get("/:name")
  async findByName(
    @Param("name") name: string,
    @Query("filters") filters: string,
  ): Promise<Logbook | null> {
    return this.logbooksService.findByName(name, filters);
  }
}
