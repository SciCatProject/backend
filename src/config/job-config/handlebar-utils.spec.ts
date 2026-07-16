import { compileJobTemplate, registerHelpers } from "./handlebar-utils";
import { JobClass } from "../../jobs/schemas/job.schema";
import { CreateJobDto } from "../../jobs/dto/create-job.dto";

describe("handlebar-utils", () => {
  beforeAll(() => {
    registerHelpers();
  });

  const createMockRequest = (): CreateJobDto => ({
    type: "test",
    jobParams: {},
  });

  describe("compileJobTemplate", () => {
    it("should compile a simple template", () => {
      const template = compileJobTemplate("Hello {{job.id}}");
      const job = { id: "test-job-123" } as JobClass;
      const context = {
        request: createMockRequest(),
        job,
        env: {},
        datasets: [],
      };

      const result = template(context);
      expect(result).toBe("Hello test-job-123");
    });

    it("should make userToken available in templates", () => {
      const template = compileJobTemplate("Bearer {{userToken}}");
      const job = { id: "test-job-123" } as JobClass;
      const context = {
        request: createMockRequest(),
        job,
        env: {},
        datasets: [],
        userToken: "my-jwt-token-abc123",
      };

      const result = template(context);
      expect(result).toBe("Bearer my-jwt-token-abc123");
    });

    it("should render empty string when userToken is undefined", () => {
      const template = compileJobTemplate("Bearer {{userToken}}");
      const job = { id: "test-job-123" } as JobClass;
      const context = {
        request: createMockRequest(),
        job,
        env: {},
        datasets: [],
      };

      const result = template(context);
      expect(result).toBe("Bearer ");
    });

    it("should use userToken in authorization header template", () => {
      const template = compileJobTemplate("Bearer {{userToken}}");
      const job = { id: "test-job-123" } as JobClass;
      const context = {
        request: createMockRequest(),
        job,
        env: {},
        datasets: [],
        userToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
      };

      const result = template(context);
      expect(result).toBe("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test");
    });

    it("should combine userToken with job properties", () => {
      const template = compileJobTemplate(
        "Job {{job.id}} - Token: {{userToken}}",
      );
      const job = { id: "job-456" } as JobClass;
      const context = {
        request: createMockRequest(),
        job,
        env: {},
        datasets: [],
        userToken: "token-xyz",
      };

      const result = template(context);
      expect(result).toBe("Job job-456 - Token: token-xyz");
    });

    it("should handle userToken in URL template", () => {
      const template = compileJobTemplate(
        "http://api.example.com/data?token={{userToken}}",
      );
      const job = { id: "test-job" } as JobClass;
      const context = {
        request: createMockRequest(),
        job,
        env: {},
        datasets: [],
        userToken: "my-secret-token",
      };

      const result = template(context);
      expect(result).toBe("http://api.example.com/data?token=my-secret-token");
    });
  });
});
