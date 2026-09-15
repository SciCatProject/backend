import { InternalServerErrorException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { Policy, PolicyDocument } from "../schemas/policy.schema";
import { UpdatePolicyDto } from "../dto/update-policy.dto";
import {
  archiveV3FieldMap,
  retrieveV3FieldMap,
  PolicyArchiveFragmentDto,
  PolicyObsoleteDto,
  PolicyRetrieveFragmentDto,
} from "../dto/policy.obsolete.dto";
import {
  LEGACY_ARCHIVE_PIPE,
  LEGACY_RETRIEVE_PIPE,
} from "../pipes/legacy-policy.pipe";

/**
 * v3 exposes one flat "policy" resource per ownerGroup, hardcoding exactly
 * two job types: archive and retrieve. Storage is one Policy document per
 * (ownerGroup, type). These helpers bridge the two directly - no generic
 * "any number of types" shape in between, since v3 was never generic
 * across job types either.
 *
 * `manager`/`ownerGroup`/`accessGroups`/`isPublished` apply to both type
 * documents at once (v3 has only one flat field for each), so a v3 write
 * touching only those "common" fields still needs to reach both documents -
 * see hasArchiveFields/hasRetrieveFields below.
 */

const COMMON_LEGACY_FIELDS = new Set([
  "manager",
  "ownerGroup",
  "accessGroups",
  "isPublished",
]);

export function hasArchiveFields(body: Partial<UpdatePolicyDto>): boolean {
  return Object.keys(body).some(
    (key) => key in archiveV3FieldMap || COMMON_LEGACY_FIELDS.has(key),
  );
}

export function hasRetrieveFields(body: Partial<UpdatePolicyDto>): boolean {
  return Object.keys(body).some(
    (key) => key in retrieveV3FieldMap || COMMON_LEGACY_FIELDS.has(key),
  );
}

export function toArchivePolicy(
  body: Partial<UpdatePolicyDto>,
): Partial<Policy> {
  return { ...LEGACY_ARCHIVE_PIPE.transform(body), type: "archive" };
}

export function toRetrievePolicy(
  body: Partial<UpdatePolicyDto>,
): Partial<Policy> {
  return { ...LEGACY_RETRIEVE_PIPE.transform(body), type: "retrieve" };
}

export function findUniqueByType(
  policies: PolicyDocument[],
  type: string,
): PolicyDocument | undefined {
  const matches = policies.filter((policy) => policy.type === type);
  if (matches.length > 1) {
    throw new InternalServerErrorException(
      `Data integrity error: found ${matches.length} Policy documents for ownerGroup "${policies[0]?.ownerGroup}" and type "${type}", expected at most 1.`,
    );
  }
  return matches[0];
}

/**
 * Combines the archive and retrieve documents for one ownerGroup into the
 * flat plain object PolicyObsoleteDto expects. Either document may be
 * missing (e.g. a stray/legacy ownerGroup with no policy of that type at
 * all) - PolicyArchiveFragmentDto/PolicyRetrieveFragmentDto fall back to
 * their documented v3 defaults in that case. Extraneous fields spread in
 * from the representative document (its own `type`, `emailTo`, ...) are
 * harmless: PolicyObsoleteDto only exposes the fields it declares.
 *
 * The merged object's envelope fields (`_id`, `id`, `createdAt`, ...) come
 * from whichever document is `representative`: the archive document when it
 * exists, the retrieve document otherwise. This is a deliberate, documented
 * convention, not an accident of argument order - it's the answer to "what
 * id does GET .../<retrieveDocId> echo back, given v3 only has room for
 * one id in its response": always the archive document's id, if there is
 * one. A pure-v3 client can never actually observe this (v3 has never
 * exposed the retrieve document's id anywhere), but a client mixing v4 and
 * v3 usage - e.g. listing via v4, then fetching one of those ids via v3 -
 * can, so it's worth being predictable about.
 */
export function mergeArchiveRetrieveToLegacyDto(
  archiveDoc: PolicyDocument | undefined,
  retrieveDoc: PolicyDocument | undefined,
): PolicyObsoleteDto | null {
  const representative = archiveDoc ?? retrieveDoc;
  if (!representative) return null;

  const manager = [
    ...new Set([
      ...(archiveDoc?.manager ?? []),
      ...(retrieveDoc?.manager ?? []),
    ]),
  ];

  const archiveFragment = plainToInstance(
    PolicyArchiveFragmentDto,
    archiveDoc ?? {},
    { excludeExtraneousValues: true },
  );
  const retrieveFragment = plainToInstance(
    PolicyRetrieveFragmentDto,
    retrieveDoc ?? {},
    { excludeExtraneousValues: true },
  );

  return {
    ...(representative.toObject({ virtuals: true }) as Omit<
      Policy,
      "manager"
    > & { id: string }),
    manager,
    ...archiveFragment,
    ...retrieveFragment,
  };
}
