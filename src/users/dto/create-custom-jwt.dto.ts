import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

export class CreateCustomJwt {
  @ApiProperty({
    required: false,
    description:
      "When the token is going to expire. It can be expressed as the number of ms or as a string according to the documentation available at https://github.com/auth0/node-jsonwebtoken#readme",
  })
  @IsOptional()
  @Type(() => String)
  @IsString()
  readonly expiresIn?: string;
}
