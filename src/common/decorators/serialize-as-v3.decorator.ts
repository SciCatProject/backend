import { SerializeOptions, Type } from "@nestjs/common";

export function SerializeAsV3(type: Type<unknown>) {
  return SerializeOptions({ type, excludeExtraneousValues: true });
}
