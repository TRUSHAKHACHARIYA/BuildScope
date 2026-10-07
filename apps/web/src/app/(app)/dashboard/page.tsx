import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { BackendStatus } from "@/features/system-status/components/backend-status";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">BuildScope</h1>
        <Suspense fallback={<p className="text-sm text-muted-foreground">&nbsp;</p>}>
          <Greeting />
        </Suspense>
      </header>

      <BackendStatus />

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            Create a project to start scoping. Discovery research arrives in upcoming releases.
          </CardDescription>
          <CardAction>
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">View projects</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}

async function Greeting() {
  const user = await getCurrentUser();
  return (
    <p className="text-sm text-muted-foreground">
      Welcome back, {user.name}. AI-powered project discovery and product intelligence.
    </p>
  );
}
