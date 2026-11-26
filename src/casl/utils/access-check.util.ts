import { CaslCollection } from "../types/casl-collection.enum";
import {
  AccessHandler,
  IAccessCheck,
} from "../interfaces/access-check.interface";

export function accessCheck(
  key: CaslCollection | string,
  handler: AccessHandler,
): IAccessCheck {
  return { collection: key as CaslCollection, handler: handler };
}
