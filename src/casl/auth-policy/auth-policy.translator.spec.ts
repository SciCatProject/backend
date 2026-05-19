import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { AuthPolicy } from "./auth-policy.interface";
import {
  AuthPolicyTranslator,
  resolvePlaceholders,
} from "./auth-policy.translator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeUser = (groups: string[]): JWTUser => ({
  _id: "uid1",
  username: "testuser",
  email: "test@example.com",
  currentGroups: groups,
});

const translator = new AuthPolicyTranslator();

// ---------------------------------------------------------------------------
// Minimal policy fixture
// ---------------------------------------------------------------------------

const minimalPolicy: AuthPolicy = {
  version: 1,
  endpoints: {},
  instance: {},
};

// ---------------------------------------------------------------------------
// resolvePlaceholders
// ---------------------------------------------------------------------------

describe("resolvePlaceholders", () => {
  const user = makeUser(["group1", "group2"]);

  it("returns undefined when there are no conditions", () => {
    expect(resolvePlaceholders({ action: "read", subject: "Dataset" }, user)).toBeUndefined();
  });

  it("passes through static (non-placeholder) conditions unchanged", () => {
    const result = resolvePlaceholders(
      { action: "read", subject: "Dataset", conditions: { isPublished: true } },
      user,
    );
    expect(result).toEqual({ isPublished: true });
  });

  it("replaces {{user.username}} with the scalar username string", () => {
    const result = resolvePlaceholders(
      {
        action: "read",
        subject: "Dataset",
        conditions: { ownerUser: "{{user.username}}" },
      },
      user,
    );
    expect(result).toEqual({ ownerUser: "testuser" });
  });

  it("replaces {{user.currentGroups}} with { $in: [...] } when value is an array", () => {
    const result = resolvePlaceholders(
      {
        action: "read",
        subject: "Dataset",
        conditions: { ownerGroup: "{{user.currentGroups}}" },
      },
      user,
    );
    expect(result).toEqual({ ownerGroup: { $in: ["group1", "group2"] } });
  });

  it("mixes static conditions and placeholders in one call", () => {
    const result = resolvePlaceholders(
      {
        action: "read",
        subject: "Dataset",
        conditions: {
          isPublished: false,
          ownerGroup: "{{user.currentGroups}}",
        },
      },
      user,
    );
    expect(result).toEqual({
      isPublished: false,
      ownerGroup: { $in: ["group1", "group2"] },
    });
  });

  it("throws BadRequestException when user is null but a placeholder is present", () => {
    expect(() =>
      resolvePlaceholders(
        {
          action: "read",
          subject: "Dataset",
          conditions: { ownerGroup: "{{user.currentGroups}}" },
        },
        null,
      ),
    ).toThrow(/no authenticated user is available/);
  });

  it("throws BadRequestException for undefined user field", () => {
    const partialUser = { ...user, currentGroups: undefined } as unknown as JWTUser;
    expect(() =>
      resolvePlaceholders(
        {
          action: "read",
          subject: "Dataset",
          conditions: { ownerGroup: "{{user.currentGroups}}" },
        },
        partialUser,
      ),
    ).toThrow(/is undefined/);
  });

  it("throws BadRequestException for unsupported placeholder namespace", () => {
    expect(() =>
      resolvePlaceholders(
        {
          action: "read",
          subject: "Dataset",
          conditions: { ownerGroup: "{{req.headers}}" },
        },
        user,
      ),
    ).toThrow(/Unsupported placeholder namespace/);
  });
});

// ---------------------------------------------------------------------------
// buildEndpointAbility
// ---------------------------------------------------------------------------

describe("AuthPolicyTranslator.buildEndpointAbility", () => {
  it("returns an ability that allows nothing for an empty policy", () => {
    const ability = translator.buildEndpointAbility(minimalPolicy, null);
    expect(ability.can("read", DatasetClass)).toBe(false);
  });

  it("grants default rules to unauthenticated users", () => {
    const policy: AuthPolicy = {
      version: 1,
      endpoints: {
        defaults: [{ action: "read", subject: "Dataset" }],
      },
      instance: {},
    };
    const ability = translator.buildEndpointAbility(policy, null);
    expect(ability.can("read", DatasetClass)).toBe(true);
    expect(ability.can("create", DatasetClass)).toBe(false);
  });

  it("grants default rules to authenticated users as well", () => {
    const policy: AuthPolicy = {
      version: 1,
      endpoints: {
        defaults: [{ action: "read", subject: "Dataset" }],
      },
      instance: {},
    };
    const ability = translator.buildEndpointAbility(policy, makeUser([]));
    expect(ability.can("read", DatasetClass)).toBe(true);
  });

  it("grants group rules only to users in the matching group", () => {
    const policy: AuthPolicy = {
      version: 1,
      endpoints: {
        groups: {
          admin: {
            can: [{ action: "manage", subject: "all" }],
            cannot: [],
          },
        },
      },
      instance: {},
    };
    const adminAbility = translator.buildEndpointAbility(
      policy,
      makeUser(["admin"]),
    );
    expect(adminAbility.can("create", DatasetClass)).toBe(true);
    expect(adminAbility.can("delete", DatasetClass)).toBe(true);

    const userAbility = translator.buildEndpointAbility(
      policy,
      makeUser(["user"]),
    );
    expect(userAbility.can("create", DatasetClass)).toBe(false);
  });

  it("does NOT apply group rules for unauthenticated users (null)", () => {
    const policy: AuthPolicy = {
      version: 1,
      endpoints: {
        groups: {
          admin: {
            can: [{ action: "manage", subject: "all" }],
            cannot: [],
          },
        },
      },
      instance: {},
    };
    const ability = translator.buildEndpointAbility(policy, null);
    expect(ability.can("create", DatasetClass)).toBe(false);
  });

  it("group cannot overrides group can for the same action+subject", () => {
    const policy: AuthPolicy = {
      version: 1,
      endpoints: {
        groups: {
          editor: {
            can: [{ action: "manage", subject: "all" }],
            cannot: [{ action: "delete", subject: "Dataset" }],
          },
        },
      },
      instance: {},
    };
    const ability = translator.buildEndpointAbility(
      policy,
      makeUser(["editor"]),
    );
    expect(ability.can("read", DatasetClass)).toBe(true);
    expect(ability.can("delete", DatasetClass)).toBe(false);
  });

  it("group rules win over default rules (group applied after defaults)", () => {
    const policy: AuthPolicy = {
      version: 1,
      endpoints: {
        defaults: [{ action: "read", subject: "Dataset" }],
        groups: {
          restricted: {
            can: [],
            cannot: [{ action: "read", subject: "Dataset" }],
          },
        },
      },
      instance: {},
    };
    const ability = translator.buildEndpointAbility(
      policy,
      makeUser(["restricted"]),
    );
    expect(ability.can("read", DatasetClass)).toBe(false);
  });

  it("throws for an unknown subject name", () => {
    const policy: AuthPolicy = {
      version: 1,
      endpoints: {
        defaults: [{ action: "read", subject: "NonExistentSubject" }],
      },
      instance: {},
    };
    expect(() => translator.buildEndpointAbility(policy, null)).toThrow(
      /Unknown subject/,
    );
  });

  it("user belonging to multiple groups gets union of all their rules", () => {
    const policy: AuthPolicy = {
      version: 1,
      endpoints: {
        groups: {
          proposalWriter: {
            can: [{ action: "create", subject: "Proposal" }],
            cannot: [],
          },
          datasetReader: {
            can: [{ action: "read", subject: "Dataset" }],
            cannot: [],
          },
        },
      },
      instance: {},
    };
    const ability = translator.buildEndpointAbility(
      policy,
      makeUser(["proposalWriter", "datasetReader"]),
    );
    expect(ability.can("create", ProposalClass)).toBe(true);
    expect(ability.can("read", DatasetClass)).toBe(true);
    expect(ability.can("delete", DatasetClass)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildInstanceAbility
// ---------------------------------------------------------------------------

describe("AuthPolicyTranslator.buildInstanceAbility", () => {
  it("returns an ability that denies everything for an empty policy", () => {
    const ability = translator.buildInstanceAbility(minimalPolicy, null);
    expect(ability.can("read", DatasetClass)).toBe(false);
  });

  it("applies instance defaults with static conditions (isPublished: true)", () => {
    const policy: AuthPolicy = {
      version: 1,
      endpoints: {},
      instance: {
        defaults: {
          can: [
            {
              action: "read",
              subject: "Dataset",
              conditions: { isPublished: true },
            },
          ],
          cannot: [],
        },
      },
    };
    const ability = translator.buildInstanceAbility(policy, null);
    // Should be able to read a published dataset
    expect(ability.can("read", new DatasetClass())).toBe(false); // default DatasetClass instance is not published

    const publishedDataset = Object.assign(new DatasetClass(), {
      isPublished: true,
    });
    expect(ability.can("read", publishedDataset)).toBe(true);
  });

  it("resolves {{user.currentGroups}} placeholder in conditions", () => {
    const policy: AuthPolicy = {
      version: 1,
      endpoints: {},
      instance: {
        groups: {
          user: {
            can: [
              {
                action: "read",
                subject: "Dataset",
                conditions: { ownerGroup: "{{user.currentGroups}}" },
              },
            ],
            cannot: [],
          },
        },
      },
    };
    const user = makeUser(["user"]);
    const ability = translator.buildInstanceAbility(policy, user);

    const ownedDataset = Object.assign(new DatasetClass(), {
      ownerGroup: "user",
    });
    expect(ability.can("read", ownedDataset)).toBe(true);

    const otherDataset = Object.assign(new DatasetClass(), {
      ownerGroup: "other-group",
    });
    expect(ability.can("read", otherDataset)).toBe(false);
  });

  it("admin manage:all overrides later cannot:delete rule", () => {
    const policy: AuthPolicy = {
      version: 1,
      endpoints: {},
      instance: {
        groups: {
          admin: {
            can: [{ action: "manage", subject: "all" }],
            cannot: [{ action: "delete", subject: "Dataset" }],
          },
        },
      },
    };
    const ability = translator.buildInstanceAbility(policy, makeUser(["admin"]));
    expect(ability.can("read", DatasetClass)).toBe(true);
    expect(ability.can("create", DatasetClass)).toBe(true);
    // cannot("delete") applied after can("manage"), so delete is denied
    expect(ability.can("delete", DatasetClass)).toBe(false);
  });

  it("group cannot rules win over defaults can rules", () => {
    const policy: AuthPolicy = {
      version: 1,
      endpoints: {},
      instance: {
        defaults: {
          can: [{ action: "read", subject: "Dataset", conditions: { isPublished: true } }],
          cannot: [],
        },
        groups: {
          blocked: {
            can: [],
            cannot: [{ action: "read", subject: "Dataset" }],
          },
        },
      },
    };
    const ability = translator.buildInstanceAbility(policy, makeUser(["blocked"]));
    const publishedDataset = Object.assign(new DatasetClass(), { isPublished: true });
    expect(ability.can("read", publishedDataset)).toBe(false);
  });
});
