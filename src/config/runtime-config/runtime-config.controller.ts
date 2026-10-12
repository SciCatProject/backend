import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { AllowAny } from "src/auth/decorators/allow-any.decorator";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { OutputRuntimeConfigDto } from "./dto/output-runtime-config.dto";
import { RuntimeConfigService } from "./runtime-config.service";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { Action } from "src/casl/action.enum";
import { AppAbility } from "src/casl/casl-ability.factory";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { RuntimeConfig } from "./schemas/runtime-config.schema";
import { UpdateRuntimeConfigDto } from "./dto/update-runtime-config.dto";
@ApiBearerAuth()
@ApiTags("runtime configurations")
@Controller("runtime-config")
export class RuntimeConfigController {
  constructor(private readonly runtimeConfigService: RuntimeConfigService) {}

  @AllowAny()
  @ApiParam({
    name: "id",
    description: "Runtime config cid (e.g. frontendConfig, frontendTheme)",
    type: String,
  })
  @ApiResponse({ status: HttpStatus.OK, type: OutputRuntimeConfigDto })
  @ApiOperation({ summary: "Get runtime configuration by cid" })
  @ApiOkResponse({ type: OutputRuntimeConfigDto })
  @ApiNotFoundResponse({ description: "Config ':id' not found" })
  @Get(":id")
  async getConfig(
    @Param("id") cid: string,
  ): Promise<OutputRuntimeConfigDto | null> {
    const config = await this.runtimeConfigService.getConfig(cid);

    return config;
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("runtimeconfig", (ability: AppAbility) =>
    ability.can(Action.Update, RuntimeConfig),
  )
  @Put(":id")
  @ApiParam({
    name: "id",
    description: "Runtime config cid (e.g. frontendConfig, frontendTheme)",
    schema: { type: "string" },
  })
  @ApiBody({
    type: Object,
    description: "Runtime config object",
  })
  @ApiOkResponse({ type: OutputRuntimeConfigDto })
  @ApiNotFoundResponse({ description: "Config ':id' not found" })
  @ApiOperation({ summary: "Overwrite runtime configuration by cid" })
  async updateConfig(
    @Req() request: Request,
    @Param("id") cid: string,
    @Body() updateRuntimeConfigDto: UpdateRuntimeConfigDto,
  ): Promise<OutputRuntimeConfigDto | null> {
    const user: JWTUser = request.user as JWTUser;
    return await this.runtimeConfigService.updateConfig(
      cid,
      updateRuntimeConfigDto,
      user,
    );
  }
}
