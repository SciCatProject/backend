import { Request } from "express";
import { ConfigService } from "@nestjs/config";

export const SSE_STREAM_PATH = "/api/v3/events/stream";

export const fromSseTicket = (req: Request): string | null => {
  if (req.path !== SSE_STREAM_PATH) return null;
  const ticket = req.query?.ticket;
  return typeof ticket === "string" ? ticket : null;
};

export const requireJwtSecret = (configService: ConfigService): string => {
  const secret = configService.get<string>("jwt.secret");

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in the environment variables.");
  }
  return secret;
};
