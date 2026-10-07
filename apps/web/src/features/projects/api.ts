import "server-only";

import type { Project, ProjectCreate, ProjectList } from "@buildscope/shared";

import { backendFetch } from "@/lib/api/backend";

export function listProjects(): Promise<ProjectList> {
  return backendFetch<ProjectList>("/api/v1/projects?limit=100");
}

export function createProject(data: ProjectCreate): Promise<Project> {
  return backendFetch<Project>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
