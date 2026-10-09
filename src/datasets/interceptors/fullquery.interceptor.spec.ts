import { CallHandler, ExecutionContext } from "@nestjs/common";
import { firstValueFrom, Observable, of } from "rxjs";
import { FullQueryInterceptor } from "./fullquery.interceptor";

describe("FullQueryInterceptor metadata paths", () => {
  it.each([
    ["length", { length: { value: 1, unit: "m" } }, "length"],
    [
      "group name.attribute name",
      { "group name": { "attribute name": { value: 1, unit: "m" } } },
      "attribute name",
    ],
    [
      "group name.efficiency%",
      { "group name": { "efficiency%": { value: 1, unit: "m" } } },
      "efficiency%",
    ],
  ])("converts response units for %s", async (lhs, scientificMetadata, key) => {
    const data = [{ scientificMetadata }];
    const request = {
      query: {
        fields: JSON.stringify({ scientific: [{ lhs, unit: "cm" }] }),
      },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    const next: CallHandler = { handle: () => of(data) };

    const response = await firstValueFrom(
      new FullQueryInterceptor().intercept(context, next) as Observable<
        typeof data
      >,
    );

    const metadata = response[0].scientificMetadata as Record<string, unknown>;
    const group = (metadata["group name"] ?? metadata) as Record<
      string,
      unknown
    >;
    expect(group[key]).toEqual({ value: 100, unit: "cm" });
    expect(Object.keys(group)).toEqual([key]);
  });
});
