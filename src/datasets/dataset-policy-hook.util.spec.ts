import { Schema } from "mongoose";
import { PoliciesService } from "src/policies/policies.service";
import { applyDatasetPolicyHookOnce } from "./dataset-policy-hook.util";

describe("applyDatasetPolicyHookOnce", () => {
  let schema: Schema;
  let policyService: {
    findOne: jest.Mock;
    addDefaultPolicy: jest.Mock;
  };

  beforeEach(() => {
    schema = new Schema();
    policyService = {
      findOne: jest.fn(),
      addDefaultPolicy: jest.fn(),
    };
  });

  const saveHooks = () =>
    (
      schema as unknown as { s: { hooks: { _pres: Map<string, unknown[]> } } }
    ).s.hooks._pres.get("save") ?? [];

  it("registers the save hook once across repeated factory runs", () => {
    for (let i = 0; i < 3; i++) {
      applyDatasetPolicyHookOnce(schema, {
        ...policyService,
      } as unknown as PoliciesService);
    }

    expect(saveHooks()).toHaveLength(1);
    expect(schema._datasetPolicyHookApplied).toBe(true);
  });

  it("sets _id and classification from the owner group policy", async () => {
    policyService.findOne.mockResolvedValue({ tapeRedundancy: "high" });
    applyDatasetPolicyHookOnce(
      schema,
      policyService as unknown as PoliciesService,
    );
    const hook = (saveHooks()[0] as { fn: (next: () => void) => Promise<void> })
      .fn;
    const dataset = {
      pid: "pid-1",
      ownerGroup: "group",
      classification: undefined as string | undefined,
      _id: undefined as string | undefined,
    };
    const next = jest.fn();

    await hook.call(dataset, next);

    expect(policyService.findOne).toHaveBeenCalledWith({ ownerGroup: "group" });
    expect(policyService.addDefaultPolicy).not.toHaveBeenCalled();
    expect(dataset._id).toBe("pid-1");
    expect(dataset.classification).toBe("IN=medium,AV=high,CO=low");
    expect(next).toHaveBeenCalled();
  });
});
