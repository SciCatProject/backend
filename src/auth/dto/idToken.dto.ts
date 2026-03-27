import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class IdTokenDto {
  @ApiProperty({
    required: true,
    description:
      "OpenID Connect ID Token issued by the external identity provider for SciCat user authentication. " +
      "The token must contain the user's identity claims (e.g., subject, email, name) and is verified " +
      "by the backend to authenticate the user and generate a SciCat JWT access token.",
    example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  readonly idToken: string;
}
