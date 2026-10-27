import { AppAbility } from "../types/casl-subjects";
import { CaslCollection } from "../types/casl-collection.enum";

interface IAccessHandler {
  handle(ability: AppAbility): boolean;
}

type AccessHandlerCallback = (ability: AppAbility) => boolean;

export type AccessHandler = IAccessHandler | AccessHandlerCallback;

export interface IAccessCheck {
  collection: CaslCollection;
  handler: AccessHandler;
}
