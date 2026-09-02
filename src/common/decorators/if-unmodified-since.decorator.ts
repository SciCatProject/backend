import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { parseDate } from "src/common/utils";

export const IfUnmodifiedSince = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Date | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return parseDate(request.headers["if-unmodified-since"]);
  },
);
