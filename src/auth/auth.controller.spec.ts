import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { Response } from "express";
import { Session } from "express-session";
import { ConfigService } from "@nestjs/config";

class AuthServiceMock {
  login() {
    return {
      username: "Test User",
      email: "testUser@gmail.com",
      access_token: "xyz",
      userId: "abc",
    };
  }

  adLogin() {
    return { username: "Test User", email: "testUser@gmail.com" };
  }

  whoami() {
    return { username: "Test User", email: "testUser@gmail.com" };
  }
}

describe("AuthController", () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        ConfigService,
        { provide: AuthService, useClass: AuthServiceMock },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should redirect to successUrl for the client from session with returnUrl in query params", async () => {
    const mockResponse: Response = {
      req: {
        session: {
          client: "scicat",
          returnUrl: "/datasets123",
          successUrl: "https://scicat-frontend.com/",
        } as unknown as Session,
      },
      redirect: jest.fn<void, [string]>(),
    } as unknown as Response;

    await controller.loginCallback(mockResponse);

    expect(mockResponse.redirect).toHaveBeenCalled();
    const redirectedUrl = (
      mockResponse.redirect as unknown as jest.Mock<void, [string]>
    ).mock.calls[0][0];
    console.log("redirectedURL is", redirectedUrl);
    const url = new URL(redirectedUrl);
    expect(url.origin).toEqual<string>(
      new URL("https://scicat-frontend.com/").origin,
    );
    expect(url.searchParams.get("access-token")).toEqual<string>("xyz");
    expect(url.searchParams.get("user-id")).toEqual<string>("abc");
    expect(url.searchParams.get("returnUrl")).toEqual<string>("/datasets123");
  });

  it("should throw exception if successUrl is not set", async () => {
    const mockResponse: Response = {
      req: {
        session: {
          client: "maxiv",
        } as unknown as Session,
      },
      redirect: jest.fn<void, [string]>(),
    } as unknown as Response;
    // Because the new URL(...) constructor fails for empty string
    await expect(controller.loginCallback(mockResponse)).rejects.toThrow(
      "Invalid URL",
    );
  });
});
