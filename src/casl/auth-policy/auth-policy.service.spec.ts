import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { AuthPolicyService } from "./auth-policy.service";

// ---------------------------------------------------------------------------
// Helpers to create temporary policy files
// ---------------------------------------------------------------------------

function writeTemp(content: string): string {
  const file = path.join(os.tmpdir(), `auth-policy-${Date.now()}.json`);
  fs.writeFileSync(file, content, "utf8");
  return file;
}

function cleanup(file: string) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AuthPolicyService", () => {
  async function buildService(authPolicyFile: string) {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [() => ({ authPolicyFile })],
        }),
      ],
      providers: [AuthPolicyService],
    }).compile();

    return module.get<AuthPolicyService>(AuthPolicyService);
  }

  it("returns null when the file path points to a non-existent file", async () => {
    const service = await buildService("/tmp/does-not-exist.json");
    expect(service.getPolicy()).toBeNull();
  });

  it("returns null when the configured path is an empty string", async () => {
    const service = await buildService("");
    expect(service.getPolicy()).toBeNull();
  });

  it("loads and validates a minimal valid policy", async () => {
    const file = writeTemp(
      JSON.stringify({
        version: 1,
        endpoints: {},
        instance: {},
      }),
    );
    try {
      const service = await buildService(file);
      const policy = service.getPolicy();
      expect(policy).not.toBeNull();
      expect(policy!.version).toBe(1);
    } finally {
      cleanup(file);
    }
  });

  it("loads a policy with endpoint defaults and group rules", async () => {
    const file = writeTemp(
      JSON.stringify({
        version: 1,
        endpoints: {
          defaults: [{ action: "read", subject: "Dataset" }],
          groups: {
            admin: {
              can: [{ action: "manage", subject: "all" }],
              cannot: [],
            },
          },
        },
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
          groups: {},
        },
      }),
    );
    try {
      const service = await buildService(file);
      const policy = service.getPolicy();
      expect(policy!.endpoints.defaults).toHaveLength(1);
      expect(policy!.endpoints.defaults![0].action).toBe("read");
      expect(policy!.instance.defaults!.can).toHaveLength(1);
    } finally {
      cleanup(file);
    }
  });

  it("throws on malformed JSON", async () => {
    const file = writeTemp("{ invalid json }");
    try {
      await expect(buildService(file)).rejects.toThrow(
        /Failed to parse auth policy/,
      );
    } finally {
      cleanup(file);
    }
  });

  it("throws when required top-level keys are missing", async () => {
    const file = writeTemp(JSON.stringify({ version: 1 }));
    try {
      await expect(buildService(file)).rejects.toThrow(
        /Invalid auth policy/,
      );
    } finally {
      cleanup(file);
    }
  });

  it("throws when a rule entry is missing the required 'action' field", async () => {
    const file = writeTemp(
      JSON.stringify({
        version: 1,
        endpoints: {
          defaults: [{ subject: "Dataset" }], // missing action
        },
        instance: {},
      }),
    );
    try {
      await expect(buildService(file)).rejects.toThrow(/Invalid auth policy/);
    } finally {
      cleanup(file);
    }
  });

  it("throws when a rule entry is missing the required 'subject' field", async () => {
    const file = writeTemp(
      JSON.stringify({
        version: 1,
        endpoints: {
          defaults: [{ action: "read" }], // missing subject
        },
        instance: {},
      }),
    );
    try {
      await expect(buildService(file)).rejects.toThrow(/Invalid auth policy/);
    } finally {
      cleanup(file);
    }
  });
});
