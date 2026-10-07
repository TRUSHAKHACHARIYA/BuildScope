import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Trim and lower-case first, then validate: `z.email()` alone would reject surrounding spaces.
const emailField = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password"),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name").max(100, "Name is too long"),
    email: emailField,
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
      .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;

/** Maps Better Auth error codes to messages that do not leak account existence details. */
export function authErrorMessage(error: { code?: string; status?: number } | null | undefined) {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Incorrect email or password.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Try signing in.";
    case "PASSWORD_TOO_SHORT":
      return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
    case "PASSWORD_TOO_LONG":
      return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
    default:
      if (error?.status === 429) return "Too many attempts. Wait a minute and try again.";
      return "Something went wrong. Please try again.";
  }
}
