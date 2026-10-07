import { CreateRelationshipDto } from "../dto/create-relationship.dto";
import { RelatedIdentifierMatchesType } from "./related-identifier-validator.util";
import { ValidationArguments } from "class-validator";

describe("RelatedIdentifierMatchesType", () => {
  const validator = new RelatedIdentifierMatchesType();

  const makeArgs = (
    object: Partial<CreateRelationshipDto>,
  ): ValidationArguments =>
    ({
      targetName: "CreateRelationshipDto",
      object,
      property: "identifier",
      value: object.identifier,
      constraints: [],
    }) as ValidationArguments;

  it("validates URL when identifierType is URL", () => {
    expect(
      validator.validate(
        "https://example.org/datasets/123",
        makeArgs({
          identifier: "https://example.org/datasets/123",
          identifierType: "URL",
        }),
      ),
    ).toBe(true);
  });

  it("rejects invalid URL when identifierType is URL", () => {
    expect(
      validator.validate(
        "noturl/datasets/123",
        makeArgs({
          identifier: "noturl/datasets/123",
          identifierType: "URL",
        }),
      ),
    ).toBe(false);
  });

  it("accepts any string when identifierType is missing", () => {
    expect(
      validator.validate("anything123", makeArgs({ identifier: "Other" })),
    ).toBe(true);
  });

  it("provides a descriptive default message", () => {
    const message = validator.defaultMessage(
      makeArgs({ identifier: "foo", identifierType: "URL" }),
    );
    expect(message).toContain("URL");
  });
});
