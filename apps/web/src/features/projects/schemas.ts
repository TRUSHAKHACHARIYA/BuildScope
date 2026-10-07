import { z } from "zod";

import { PROJECT_DESCRIPTION_MAX_LENGTH, PROJECT_NAME_MAX_LENGTH } from "@buildscope/shared";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a project name")
    .max(PROJECT_NAME_MAX_LENGTH, `Use at most ${PROJECT_NAME_MAX_LENGTH} characters`),
  description: z
    .string()
    .trim()
    .max(PROJECT_DESCRIPTION_MAX_LENGTH, `Use at most ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`)
    .transform((value) => value || null),
});

export interface CreateProjectState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "description", string>>;
}
