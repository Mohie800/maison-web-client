import { ApiError } from "./errors";

/**
 * Maps the API's validation messages onto form fields.
 *
 * NestJS class-validator returns a flat array of sentences that begin with the
 * property name:
 *   ["fullName should not be empty", "email must be an email", …]
 *
 * There is no structured field/message pairing, so the field is recovered from
 * the first token. Messages that don't start with a known field fall through to
 * the form-level error rather than being dropped.
 */
export function mapValidationErrors<Field extends string>(
  error: unknown,
  fields: readonly Field[],
): { fieldErrors: Partial<Record<Field, string>>; formErrors: string[] } {
  const fieldErrors: Partial<Record<Field, string>> = {};
  const formErrors: string[] = [];

  if (!(error instanceof ApiError)) {
    return { fieldErrors, formErrors };
  }

  for (const message of error.messages) {
    const first = message.split(" ")[0] as Field;
    if (fields.includes(first) && !fieldErrors[first]) {
      fieldErrors[first] = message;
    } else if (!fields.includes(first)) {
      formErrors.push(message);
    }
  }

  // A non-validation failure (401 "Invalid credentials", 409, …) has one
  // message and no field prefix.
  if (formErrors.length === 0 && Object.keys(fieldErrors).length === 0) {
    formErrors.push(error.message);
  }

  return { fieldErrors, formErrors };
}
