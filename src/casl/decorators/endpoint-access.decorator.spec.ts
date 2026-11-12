import { Reflector } from "@nestjs/core";
import { ExecutionContext, UseGuards } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";
import {
  AbilityBuilder,
  ExtractSubjectType,
  createMongoAbility,
} from "@casl/ability";
import { CaslAbilityFactory } from "../casl-ability.factory";
import { EndpointGuard } from "../guards/endpoint.guard";
import { EndpointAccess } from "./endpoint-access.decorator";
import {
  Subjects,
  PossibleAbilities,
  Conditions,
  AppAbility,
} from "../types/casl-subjects";
import { Action } from "../types/action.enum";
import { CaslCollection } from "../types/casl-collection.enum";
import { accessCheck } from "../utils/access-check.util";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { Instrument } from "src/instruments/schemas/instrument.schema";

class CaslAbilityFactoryMock {
  collectionAccess(_collection: CaslCollection, user: JWTUser | null) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    can(Action.Read, DatasetClass);
    can(Action.Read, Instrument);

    if (user) {
      can(Action.Create, DatasetClass);
      can(Action.Create, Instrument);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}

class MockController {
  @UseGuards(EndpointGuard)
  @EndpointAccess(
    accessCheck("datasets", (ability: AppAbility) =>
      ability.can(Action.Read, DatasetClass),
    ),
    accessCheck("instruments", (ability: AppAbility) =>
      ability.can(Action.Read, Instrument),
    ),
  )
  foo(_request: Request) {}

  @UseGuards(EndpointGuard)
  @EndpointAccess(
    accessCheck("datasets", (ability: AppAbility) =>
      ability.can(Action.Create, DatasetClass),
    ),
    accessCheck("instruments", (ability: AppAbility) =>
      ability.can(Action.Create, Instrument),
    ),
  )
  bar(_request: Request) {}

  @UseGuards(EndpointGuard)
  @EndpointAccess(
    accessCheck("datasets", (ability: AppAbility) =>
      ability.can(Action.Read, DatasetClass),
    ),
    accessCheck("instruments", (ability: AppAbility) =>
      ability.can(Action.Create, Instrument),
    ),
  )
  baz(_request: Request) {}
}

describe("EndpointAccess decorator and EndpointGuard", () => {
  let caslAbilityFactory: CaslAbilityFactory;
  let guard: EndpointGuard;
  let context: ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    caslAbilityFactory = module.get<CaslAbilityFactory>(CaslAbilityFactory);

    guard = new EndpointGuard(new Reflector(), caslAbilityFactory);

    context = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue({
        user: null,
      }),
      getHandler: jest.fn().mockReturnValue(MockController.prototype.foo),
      getClass: jest.fn().mockReturnValue(MockController),
    } as unknown as ExecutionContext;
  });

  it("should pass endpoint auth with two valid conditions", async () => {
    context.getHandler = jest
      .fn()
      .mockReturnValue(MockController.prototype.foo);

    await expect(guard.canActivate(context)).resolves.toEqual(true);
  });

  it("should not pass endpoint auth with two invalid conditions", async () => {
    context.getHandler = jest
      .fn()
      .mockReturnValue(MockController.prototype.bar);

    await expect(guard.canActivate(context)).resolves.toEqual(false);
  });

  it("should not pass endpoint auth with a mix of valid and invalid conditions", async () => {
    context.getHandler = jest
      .fn()
      .mockReturnValue(MockController.prototype.baz);

    await expect(guard.canActivate(context)).resolves.toEqual(false);
  });
});
