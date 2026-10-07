import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectForm } from "@/features/projects/components/create-project-form";
import { ProjectList } from "@/features/projects/components/project-list";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">Only you can see the projects you create.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>New project</CardTitle>
          <CardDescription>Name the idea you want BuildScope to research.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateProjectForm />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your projects</h2>
        <Suspense fallback={<ProjectListSkeleton />}>
          <ProjectList />
        </Suspense>
      </section>
    </div>
  );
}

function ProjectListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {[0, 1, 2].map((key) => (
        <div key={key} className="h-16 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
