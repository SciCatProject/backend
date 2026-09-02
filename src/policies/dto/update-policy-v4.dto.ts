import { PartialType } from "@nestjs/swagger";
import { CreatePolicyV4Dto } from "./create-policy-v4.dto";

export class UpdatePolicyV4Dto extends PartialType(CreatePolicyV4Dto) {}
