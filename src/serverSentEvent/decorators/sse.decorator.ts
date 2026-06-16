import { applyDecorators, UseInterceptors } from "@nestjs/common";
import { SseEventType, SseInterceptor } from "../interceptors/sse.interceptor";

export const EmitSse = (eventType: SseEventType) => {
  return applyDecorators(UseInterceptors(SseInterceptor(eventType)));
};
