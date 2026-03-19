import AjvModule from "ajv";

import type { JsonSchema } from "./types.js";

const AjvCtor: any = (AjvModule as any).default ?? AjvModule;

const ajv = new AjvCtor({
  allErrors: true,
  strict: false
});

export function assertValidJsonSchema(schema: JsonSchema): void {
  if (!ajv.validateSchema(schema)) {
    throw new Error(
      ajv.errorsText(ajv.errors, {
        separator: "; "
      }) || "Invalid JSON schema."
    );
  }
}

export function validateJsonSchema(input: { schema: JsonSchema; value: unknown; label: string }): void {
  assertValidJsonSchema(input.schema);
  const validator = ajv.compile(input.schema);
  const valid = validator(input.value);
  if (!valid) {
    throw new Error(
      `${input.label} failed schema validation: ${
        ajv.errorsText(validator.errors, {
          separator: "; "
        }) || "Unknown JSON schema validation error."
      }`
    );
  }
}
