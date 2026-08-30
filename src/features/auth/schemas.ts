import { z } from "zod";

/**
 * Validation messages are translation keys resolved against the `Validation`
 * namespace at render time, not English strings. A Zod schema is defined once
 * at module scope and cannot know the active locale, so baking in English here
 * would make every form error untranslatable in Arabic.
 */

/** Mirrors the API: E.164, as enforced by its own validator. */
const phoneRegex = /^\+[1-9]\d{7,14}$/;

/** From SetupProfileDto: "3-60 chars: lowercase letters, digits, _ or ." */
const usernameRegex = /^[a-z0-9._]{3,60}$/;

const password = z
  .string()
  .min(8, "passwordTooShort")
  .max(72, "passwordTooLong");

export const signInSchema = z
  .object({
    method: z.enum(["email", "phone"]),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    password: z.string().min(1, "required"),
  })
  .superRefine((value, ctx) => {
    if (value.method === "email") {
      if (!value.email || !z.string().email().safeParse(value.email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "emailInvalid",
        });
      }
    } else if (!value.phoneNumber || !phoneRegex.test(value.phoneNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumber"],
        message: "phoneInvalid",
      });
    }
  });

export type SignInValues = z.infer<typeof signInSchema>;

/**
 * Sign up — Figma node 651:16454.
 *
 * The design collects full name, email, password and phone together; there is no
 * email/phone toggle here (unlike sign-in, which has two separate screens).
 * Email is required and phone optional, since the API needs at least one and the
 * design marks email as the primary identifier.
 *
 * The design has no individual/business selector either, so `accountType` isn't
 * collected — registration falls back to the API's own default of `individual`.
 * Business accounts (which create `/stores` records) will need their own entry
 * point in a later flow.
 */
export const signUpSchema = z
  .object({
    fullName: z.string().min(1, "required").max(120, "tooLong"),
    email: z.string().email("emailInvalid"),
    phoneNumber: z.string().optional(),
    password,
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: "termsRequired" }),
    }),
  })
  .superRefine((value, ctx) => {
    // Optional, but must be valid E.164 if provided.
    if (value.phoneNumber && !phoneRegex.test(value.phoneNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumber"],
        message: "phoneInvalid",
      });
    }
  });

export type SignUpValues = z.infer<typeof signUpSchema>;

export const otpSchema = z.object({
  code: z.string().length(6, "otpLength"),
});

export type OtpValues = z.infer<typeof otpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("emailInvalid"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "required"),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordsMustMatch",
  });

export const profileSetupSchema = z.object({
  /** `651:16716`. Prefilled from the name given at sign-up. */
  fullName: z.string().optional(),
  username: z.string().regex(usernameRegex, "usernameInvalid"),
  dob: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  city: z.string().optional(),
  // See the note on accountType above — defaults live in useForm, not the schema.
  notifyPriceDrops: z.boolean(),
});

export type ProfileSetupValues = z.infer<typeof profileSetupSchema>;
