import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { OutputRuntimeConfigDto } from "./dto/output-runtime-config.dto";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import {
  RuntimeConfig,
  RuntimeConfigDocument,
} from "./schemas/runtime-config.schema";
import { addCreatedByFields, addUpdatedByField } from "src/common/utils";
import { UpdateRuntimeConfigDto } from "./dto/update-runtime-config.dto";

@Injectable()
export class RuntimeConfigService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    @InjectModel(RuntimeConfig.name)
    private runtimeConfigModel: Model<RuntimeConfigDocument>,
  ) {}

  async onModuleInit() {
    const configList: string[] = this.configService.get<string[]>(
      "configSyncToDb.configList",
    )!;
    for (const configId of configList) await this.syncConfig(configId);
  }

  async getConfig(cid: string): Promise<OutputRuntimeConfigDto | null> {
    const data = await this.runtimeConfigModel.findOne({ cid: cid }).lean();

    if (!data) {
      throw new NotFoundException(`Config '${cid}' not found`);
    }
    return data;
  }

  async updateConfig(
    cid: string,
    updateRuntimeConfigDto: UpdateRuntimeConfigDto,
    user: JWTUser,
  ): Promise<OutputRuntimeConfigDto | null> {
    const updateData = addUpdatedByField(updateRuntimeConfigDto, user.username);

    const updatedDoc = await this.runtimeConfigModel.findOneAndUpdate(
      { cid: cid },
      { $set: { ...updateData } },
      { new: true },
    );

    if (!updatedDoc) {
      throw new NotFoundException(`Config '${cid}' not found`);
    }
    Logger.log(
      `Updated app config entry '${cid}' by user '${updateData.updatedBy}'`,
      "RuntimeConfigService",
    );

    return updatedDoc;
  }

  async syncConfig(configId: string): Promise<void> {
    const sourceConfig =
      this.configService.get<Record<string, unknown>>(configId) || {};

    if (!sourceConfig || Object.keys(sourceConfig).length === 0) {
      Logger.error(
        `Config file: ${configId} is empty or missing, skipping sync`,
        "RuntimeConfigService",
      );
      return;
    }

    const existing = await this.runtimeConfigModel
      .findOne({ cid: configId })
      .lean();

    // If no existing config, create one from config file
    if (!existing) {
      const createData = addCreatedByFields(
        { cid: configId, data: sourceConfig },
        "system",
      );
      await this.runtimeConfigModel.create({ ...createData });
      Logger.log(
        `Created runtime config entry: '${configId}' with config file`,
        "RuntimeConfigService",
      );
      return;
    }

    // overwrite existing config with config file
    await this.runtimeConfigModel.updateOne(
      { cid: configId },
      { data: sourceConfig, updatedBy: "system" },
    );

    Logger.log(
      `RuntimeConfigService - [${configId}] synchronized with config file`,
      "RuntimeConfigService",
    );
  }
}
