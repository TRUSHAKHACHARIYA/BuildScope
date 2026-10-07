"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { BackendError } from "@/lib/api/backend";

import { createProject } from "./api";
import { createProjectSchema, type CreateProjectState } from "./schemas";

export async function createProjectAction(
  _previous: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      status: "error",
      fieldErrors: { name: fieldErrors.name?.[0], description: fieldErrors.description?.[0] },
    };
  }

  try {
    // The API authorizes the request with the signed-in user's token.
    await createProject(parsed.data);
  } catch (error) {
    if (error instanceof BackendError) return { status: "error", message: error.message };
    throw error;
  }
  refresh();
  return { status: "success", message: "Project created." };
}
