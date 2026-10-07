import { AlertCircle, FolderOpen } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BackendError } from "@/lib/api/backend";

import { listProjects } from "../api";
import { ProjectStatusBadge } from "./project-status-badge";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export async function ProjectList() {
  let projects;
  try {
    projects = await listProjects();
  } catch (error) {
    if (!(error instanceof BackendError)) throw error;
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Could not load projects</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (projects.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-sm text-muted-foreground">
        <FolderOpen className="size-6" />
        No projects yet. Create your first one above.
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-lg border" aria-label="Projects">
      {projects.items.map((project) => (
        <li key={project.id} className="flex items-start justify-between gap-4 px-4 py-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate font-medium">{project.name}</p>
            {project.description ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Created {dateFormat.format(new Date(project.created_at))}
            </p>
          </div>
          <ProjectStatusBadge status={project.status} />
        </li>
      ))}
    </ul>
  );
}
