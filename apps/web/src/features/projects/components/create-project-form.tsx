"use client";

import { Loader2, Plus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createProjectAction } from "../actions";
import type { CreateProjectState } from "../schemas";

const INITIAL_STATE: CreateProjectState = { status: "idle" };

export function CreateProjectForm() {
  const [state, formAction, pending] = useActionState(createProjectAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          id="project-name"
          name="name"
          placeholder="e.g. Employee management platform"
          aria-invalid={state.fieldErrors?.name ? true : undefined}
          required
        />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="project-description">Description (optional)</Label>
        <Textarea
          id="project-description"
          name="description"
          rows={3}
          placeholder="A short summary of what you want to build"
          aria-invalid={state.fieldErrors?.description ? true : undefined}
        />
        {state.fieldErrors?.description ? (
          <p className="text-sm text-destructive">{state.fieldErrors.description}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />}
          Create project
        </Button>
        {state.message ? (
          <p
            role="status"
            className={
              state.status === "error"
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
