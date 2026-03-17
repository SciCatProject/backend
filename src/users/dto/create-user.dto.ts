import { ApiProperty } from "@nestjs/swagger";
import { isArrayOf } from "../../common/utils";

export class CreateUserDto {
  @ApiProperty({ required: true })
  readonly username: string;

  @ApiProperty({ required: true })
  readonly email: string;

  @ApiProperty({ required: false })
  readonly password?: string;

  @ApiProperty({ required: false })
  readonly role?: string;

  @ApiProperty({ required: false })
  readonly global?: boolean;

  @ApiProperty({ required: false })
  readonly authStrategy?: string;
}

// Type guard for CreateUserDto
export function isCreateUserDto(obj: unknown): obj is CreateUserDto {
  if (typeof obj !== "object" || obj === null) return false;

  const allowedKeys = [
    "username",
    "email",
    // optional
    "password",
    "role",
    "global",
    "authStrategy",
  ];

  // Check for extra fields
  const objKeys = Object.keys(obj);
  if (!objKeys.every((key) => allowedKeys.includes(key))) return false;

  // Type checks
  if (!("username" in obj) || typeof obj.username !== "string") return false;
  if (!("email" in obj) || typeof obj.email !== "string") return false;
  if ("password" in obj && typeof obj.password !== "string") return false;
  if ("role" in obj && typeof obj.role !== "string") return false;
  if ("global" in obj && typeof obj.global !== "boolean") return false;
  if ("authStrategy" in obj && typeof obj.authStrategy !== "string")
    return false;

  return true;
}

// Type guard for CreateUserDto[]
export const isCreateUserDtoArray = isArrayOf(isCreateUserDto);
