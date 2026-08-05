import { Logger } from "@nestjs/common";
import { UsersService } from "src/users/users.service";

/**
 * Generates a SciCat JWT token for job execution.
 * This token is used by job actions (e.g., URL actions) to make authenticated
 * requests to other SciCat services on behalf of the user.
 *
 * @param usersService - UsersService instance for user lookup and token generation
 * @param ownerUser - The username of the job owner (from ownerUser field)
 * @param expiresIn - Optional token expiry duration (e.g. "24h", "7d"). Falls back to jwt.expiresIn.
 * @returns JWT token string, or undefined if user not found or ownerUser is undefined
 */
export async function generateJobUserToken(
  usersService: UsersService,
  ownerUser: string | undefined,
  expiresIn?: string,
): Promise<string | undefined> {
  if (!ownerUser) {
    Logger.debug("No ownerUser provided for token generation", "TokenUtils");
    return undefined;
  }

  try {
    // Look up the user by username to get their details
    const jwtUser = await usersService.findByUsername2JWTUser(ownerUser);

    if (!jwtUser) {
      Logger.warn(`User not found for ownerUser: ${ownerUser}`, "TokenUtils");
      return undefined;
    }

    // Generate JWT using the default expiration from jwt.expiresIn config
    const jwtResult = await usersService.createUserJWT(jwtUser, expiresIn);

    if (!jwtResult?.jwt) {
      Logger.warn(
        `Failed to generate JWT for ownerUser: ${ownerUser}`,
        "TokenUtils",
      );
      return undefined;
    }

    Logger.debug(`Generated JWT for ownerUser: ${ownerUser}`, "TokenUtils");
    return jwtResult.jwt;
  } catch (error) {
    Logger.error(
      `Error generating JWT for ownerUser: ${ownerUser}`,
      error,
      "TokenUtils",
    );
    return undefined;
  }
}
