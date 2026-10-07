import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const createProject = vi.fn();
vi.mock("next/cache", () => ({ refresh: () => refresh() }));
vi.mock("./api", () => ({ createProject: (data: unknown) => createProject(data) }));

const { BackendError } = await import("@/lib/api/backend");
const { createProjectAction } = await import("./actions");

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("createProjectAction", () => {
  beforeEach(() => {
    refresh.mockReset();
    createProject.mockReset();
  });

  it("creates the project with trimmed values and refreshes", async () => {
    createProject.mockResolvedValue({ id: "1" });

    const state = await createProjectAction(
      { status: "idle" },
      form({ name: "  HR suite ", description: "   " }),
    );

    expect(createProject).toHaveBeenCalledWith({ name: "HR suite", description: null });
    expect(refresh).toHaveBeenCalled();
    expect(state).toEqual({ status: "success", message: "Project created." });
  });

  it("returns field errors without calling the API", async () => {
    const state = await createProjectAction({ status: "idle" }, form({ name: " " }));

    expect(createProject).not.toHaveBeenCalled();
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.name).toBe("Enter a project name");
  });

  it("returns the API error message", async () => {
    createProject.mockRejectedValue(new BackendError(503, "API down"));

    const state = await createProjectAction({ status: "idle" }, form({ name: "P" }));

    expect(state).toEqual({ status: "error", message: "API down" });
    expect(refresh).not.toHaveBeenCalled();
  });
});
