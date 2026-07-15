import { Logger } from "@nestjs/common";
import { UsersService } from "src/users/users.service";

/**
 * Generates a SciCat JWT token for job execution.
 * This token is used by job actions (e.g., URL actions) to make authenticated
 * requests to other SciCat services on behalf of the user.
 *
 * @param usersService - UsersService instance for user lookup and token generation
 * @param userId - The user ID extracted from the original JWT at job creation
 * @returns JWT token string, or undefined if user not found or userId is undefined
 */
export async function generateJobUserToken(
  usersService: UsersService,
  userId: string | undefined,
): Promise<string | undefined> {
  if (!userId) {
    Logger.debug("No userId provided for token generation", "TokenUtils");
    return undefined;
  }

  try {
    // Look up the user by ID to get their details
    const jwtUser = await usersService.findById2JWTUser(userId);

    if (!jwtUser) {
      Logger.warn(`User not found for userId: ${userId}`, "TokenUtils");
      return undefined;
    }

    // Generate JWT using the default expiration from jwt.expiresIn config
    const jwtResult = await usersService.createUserJWT(jwtUser);

    if (!jwtResult?.jwt) {
      Logger.warn(`Failed to generate JWT for userId: ${userId}`, "TokenUtils");
      return undefined;
    }

    Logger.debug(`Generated JWT for userId: ${userId}`, "TokenUtils");
    return jwtResult.jwt;
  } catch (error) {
    Logger.error(
      `Error generating JWT for userId: ${userId}`,
      error,
      "TokenUtils",
    );
    return undefined;
  }
}
