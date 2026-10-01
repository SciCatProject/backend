import { PipeTransform } from "@nestjs/common";

export class JsonToStringPipe implements PipeTransform<
  object,
  string | object
> {
  constructor(private readonly stringifyField?: string) {}

  transform(value: object): string | object {
    try {
      if (!this.stringifyField) return JSON.stringify(value);
      if (!(this.stringifyField in value)) return value;
      return {
        ...value,
        [this.stringifyField]: JSON.stringify(
          value[this.stringifyField as keyof typeof value],
        ),
      };
    } catch {
      return value;
    }
  }
}
