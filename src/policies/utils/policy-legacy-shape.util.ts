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
  toArchivePolicyFields,
  toRetrievePolicyFields,
} from "./legacy-policy-field-map.util";

// v3 exposes one flat "policy" resource per ownerGroup, hardcoding exactly
// two job types: archive and retrieve, stored as one Policy document each.
// These helpers bridge the two shapes directly.

// Fields that apply to both type documents at once (v3 has only one flat
// field for each), so a write touching only these still needs to reach
// both documents - see hasArchiveFields/hasRetrieveFields below.
const COMMON_LEGACY_FIELDS = new Set([
  "manager",
  "ownerGroup",
  "accessGroups",
  "isPublished",
  "instrumentGroup",
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
  return { ...toArchivePolicyFields(body), type: "archive" };
}

export function toRetrievePolicy(
  body: Partial<UpdatePolicyDto>,
): Partial<Policy> {
  return { ...toRetrievePolicyFields(body), type: "retrieve" };
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

// Combines the archive and retrieve documents for one ownerGroup into the
// flat object PolicyObsoleteDto expects. Either may be missing; the
// fragment DTOs fall back to their documented v3 defaults in that case.
// Envelope fields (`_id`, `id`, `createdAt`, ...) come from the archive
// document when it exists, retrieve otherwise - deliberate, so a client
// mixing v4 and v3 usage always sees the same id for a given ownerGroup.
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
