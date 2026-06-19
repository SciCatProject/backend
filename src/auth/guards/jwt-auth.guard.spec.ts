import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let jwtAuthGuard: JwtAuthGuard;

  const createExecutionContext = (request: Request): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard, Reflector],
    }).compile();

    jwtAuthGuard = module.get(JwtAuthGuard);
  });

  it("should be defined", () => {
    expect(jwtAuthGuard).toBeDefined();
  });

  it("should set authorization header from access token query param (getRequest)", () => {
    const mockRequest: Request = {
      query: { access_token: "Bearer query-token" },
      headers: {},
    } as unknown as Request;

    const mockExecutionContext = createExecutionContext(mockRequest);
    const request = jwtAuthGuard.getRequest(mockExecutionContext);

    expect(request).toBe(mockRequest);
    expect(mockRequest.headers.authorization).toBe("Bearer query-token");
  });

  it("should preserve existing authorization header over access token query param", () => {
    const mockRequest: Request = {
      query: { access_token: "Bearer query-token" },
      headers: { authorization: "Bearer header-token" },
    } as unknown as Request;

    const mockExecutionContext = createExecutionContext(mockRequest);
    jwtAuthGuard.getRequest(mockExecutionContext);

    expect(mockRequest.headers.authorization).toBe("Bearer header-token");
  });

  it("should not set authorization header if access token query param is missing", () => {
    const mockRequest: Request = {
      query: {},
      headers: {},
    } as unknown as Request;

    const mockExecutionContext = createExecutionContext(mockRequest);
    jwtAuthGuard.getRequest(mockExecutionContext);

    expect(mockRequest.headers.authorization).toBeUndefined();
  });

  it("should return user if user is authenticated", () => {
    const mockUser = { username: "test-user" };
    const user = jwtAuthGuard.handleRequest(null, mockUser, null);

    expect(user).toBe(mockUser);
  });

  it("should throw unauthorized exception if token has expired", () => {
    expect(() =>
      jwtAuthGuard.handleRequest(null, null, { name: "TokenExpiredError" }),
    ).toThrow(UnauthorizedException);
    expect(() =>
      jwtAuthGuard.handleRequest(null, null, { name: "TokenExpiredError" }),
    ).toThrow("SESSION_EXPIRED");
  });

  it("should return null if user is not authenticated, without attempting with expired token", () => {
    const user = jwtAuthGuard.handleRequest(null, null, null);
    expect(user).toBeNull();
  });
});
