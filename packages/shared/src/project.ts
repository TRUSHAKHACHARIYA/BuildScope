/**
 * Project contracts. Keep in sync with `apps/api/app/schemas/project.py`.
 */

export const PROJECT_STATUSES = ["draft", "researching", "completed", "failed"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_NAME_MAX_LENGTH = 200;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 5000;

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectList {
  items: Project[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProjectCreate {
  name: string;
  description?: string | null;
}
