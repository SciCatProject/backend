export class PatchRuntimeConfigDto {
  /**
   * Partial configuration content to merge into existing data (JSON Merge Patch - RFC 7396).
   * Fields present with a non-null value are added/updated; fields present with null are removed.
   */
  [key: string]: unknown;
}
