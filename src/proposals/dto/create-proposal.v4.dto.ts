import { IsOptional, IsString } from "class-validator";
import { UpdateProposalV4Dto } from "./update-proposal.v4.dto";

export class CreateProposalV4Dto extends UpdateProposalV4Dto {
  @IsString()
  readonly proposalId: string;
}
