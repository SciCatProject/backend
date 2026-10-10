type Condition = Record<string, unknown>;

const isRelationPath = (path: string, relations: string[]) =>
  relations.includes(path.split(".")[0]);

// aggregation expressions refer to fields as "$path" strings
function expressionRefersToRelation(
  value: unknown,
  relations: string[],
): boolean {
  if (typeof value === "string")
    return (
      value.startsWith("$") &&
      !value.startsWith("$$") &&
      isRelationPath(value.slice(1), relations)
    );
  if (value === null || typeof value !== "object" || value instanceof Date)
    return false;
  return Object.values(value).some((v) =>
    expressionRefersToRelation(v, relations),
  );
}

/**
 * Whether a query document refers to one of the relations, through a field
 * path such as `proposals.pi_email`, in logical operators or in $expr. Keys
 * inside a field's condition are relative to that field and are not checked.
 */
export function refersToRelation(query: unknown, relations: string[]): boolean {
  if (query === null || typeof query !== "object" || Array.isArray(query))
    return false;
  return Object.entries(query).some(([key, value]) => {
    if (["$and", "$or", "$nor"].includes(key))
      return (
        Array.isArray(value) &&
        value.some((q) => refersToRelation(q, relations))
      );
    if (key === "$expr") return expressionRefersToRelation(value, relations);
    if (key.startsWith("$")) return false;
    return isRelationPath(key, relations);
  });
}

/**
 * The relations a where filter refers to, out of the given ones.
 */
export function findRelationsInWhere(
  where: Condition | undefined,
  relations: string[],
): string[] {
  return relations.filter((relation) =>
    refersToRelation(where ?? {}, [relation]),
  );
}

// the top level keys and the members of $and, which can be matched separately
function conjuncts(where: Condition): Condition[] {
  return Object.entries(where).flatMap(([key, value]) =>
    key === "$and" && Array.isArray(value)
      ? (value as Condition[]).flatMap(conjuncts)
      : [{ [key]: value }],
  );
}

const and = (conditions: Condition[]): Condition =>
  conditions.length <= 1 ? (conditions[0] ?? {}) : { $and: conditions };

/**
 * Splits a where filter into the conditions on the dataset itself, matched
 * before the relations are looked up, and those referring to the included
 * relations, matched after. $or, $nor and other operators cannot be split,
 * so they are matched after as a whole when any part refers to a relation.
 */
export function splitWhereByRelations(
  where: Condition | undefined,
  relations: string[],
): { before: Condition; after: Condition } {
  if (!where || !refersToRelation(where, relations))
    return { before: where ?? {}, after: {} };

  const before: Condition[] = [];
  const after: Condition[] = [];
  for (const condition of conjuncts(where))
    (refersToRelation(condition, relations) ? after : before).push(condition);
  return { before: and(before), after: and(after) };
}
