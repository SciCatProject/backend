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
      property: "relatedIdentifier",
      value: object.relatedIdentifier,
      constraints: [],
    }) as ValidationArguments;

  it("validates URL when relatedIdentifierType is URL", () => {
    expect(
      validator.validate(
        "https://example.org/datasets/123",
        makeArgs({
          relatedIdentifier: "https://example.org/datasets/123",
          relatedIdentifierType: "URL",
        }),
      ),
    ).toBe(true);
  });

  it("rejects invalid URL when relatedIdentifierType is URL", () => {
    expect(
      validator.validate(
        "noturl/datasets/123",
        makeArgs({
          relatedIdentifier: "noturl/datasets/123",
          relatedIdentifierType: "URL",
        }),
      ),
    ).toBe(false);
  });

  it("accepts any string when relatedIdentifierType is missing", () => {
    expect(
      validator.validate(
        "anything123",
        makeArgs({ relatedIdentifier: "Other" }),
      ),
    ).toBe(true);
  });

  it("provides a descriptive default message", () => {
    const message = validator.defaultMessage(
      makeArgs({ relatedIdentifier: "foo", relatedIdentifierType: "URL" }),
    );
    expect(message).toContain("URL");
  });
});
