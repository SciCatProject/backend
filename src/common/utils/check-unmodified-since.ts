import { PreconditionFailedException } from "@nestjs/common";

/**
 * Checks whether a resource has been modified on the server since the time
 * specified in the `If-Unmodified-Since` header.
 *
 * Throws a 412 Precondition Failed exception if the resource has been modified.
 *
 * This is useful for preventing lost updates in PATCH/PUT endpoints when multiple clients
 * may be updating the same resource concurrently.
 *
 * @param resourceDate - The `updatedAt` date of the resource on the server.
 * @param headerDateString - The value of the `If-Unmodified-Since` header from the request.
 */
export function checkUnmodifiedSince(
  resourceDate?: Date | null,
  headerDateString?: string | null,
) {
  if (!resourceDate || !headerDateString) return;

  const headerDate = new Date(headerDateString);
  if (isNaN(headerDate.getTime())) return;

  if (headerDate <= resourceDate) {
    throw new PreconditionFailedException(
      "Resource has been modified on server",
    );
  }
}
