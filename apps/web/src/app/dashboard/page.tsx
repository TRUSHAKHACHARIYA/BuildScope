import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackendStatus } from "@/features/system-status/components/backend-status";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">BuildScope</h1>
        <p className="text-sm text-muted-foreground">
          AI-powered project discovery and product intelligence.
        </p>
      </header>

      <BackendStatus />

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            Project creation and discovery research will appear here once those features ship.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
