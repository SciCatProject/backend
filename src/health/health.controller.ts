import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from "@nestjs/terminus";
import { AllowAny } from "src/auth/decorators/allow-any.decorator";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
  ) {}

  @AllowAny()
  @Get()
  @HealthCheck()
  check() {
    // Here you can add various health checks, e.g., for database, queues, etc.
    // For HTTP health checks, use the `http.pingCheck` function.
    return this.health.check([
      // The readiness endpoint verifies that the application is running and can connect to required services
      async () => this.db.pingCheck("mongodb"),
      async () => ({
        uptime: {
          status: "up",
          seconds: process.uptime(),
          bootTime: new Date(
            Date.now() - process.uptime() * 1000,
          ).toISOString(),
        },
      }),
    ]);
  }
}
