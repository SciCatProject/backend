import { ApiProperty } from "@nestjs/swagger";

export class CreateUserRoleDto {
  @ApiProperty({
    type: String,
    required: true,
    description: "Id fo the user the local user role is applied to",
  })
  readonly userId: string;

  @ApiProperty({
    type: String,
    required: true,
    description: "Name of the new local user role",
  })
  readonly name: string;
}
