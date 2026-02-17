import { Injectable } from "@nestjs/common";
import { RuntimeConfigService } from "src/config/runtime-config/runtime-config.service";

@Injectable()
export class AdminService {
  constructor(private runtimeConfigService: RuntimeConfigService) {}

  async getConfig(): Promise<Record<string, unknown> | null> {
    const config = await this.runtimeConfigService.getConfig("frontendConfig");

    return config?.data || null;
  }

  async getTheme(): Promise<Record<string, unknown> | null> {
    const theme = await this.runtimeConfigService.getConfig("frontendTheme");
    return theme?.data || null;
  }
}
