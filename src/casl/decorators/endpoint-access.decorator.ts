import { SetMetadata } from "@nestjs/common";
import { IAccessCheck } from "../interfaces/access-check.interface";

export const ENDPOINT_ACCESS_KEY = "endpoint_access";

export const EndpointAccess = (...checks: IAccessCheck[]) =>
  SetMetadata(ENDPOINT_ACCESS_KEY, [...checks]);
