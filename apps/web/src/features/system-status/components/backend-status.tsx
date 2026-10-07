"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { BackendConnection } from "../types";

const POLL_INTERVAL_MS = 15_000;

type ViewState = { state: "checking" } | BackendConnection;

async function fetchConnection(signal?: AbortSignal): Promise<BackendConnection> {
  try {
    const response = await fetch("/api/health", { cache: "no-store", signal });
    if (!response.ok) {
      return { state: "unreachable", reason: `Web server responded with HTTP ${response.status}` };
    }
    return (await response.json()) as BackendConnection;
  } catch {
    return { state: "unreachable", reason: "Could not reach the web server" };
  }
}

export function BackendStatus() {
  const [view, setView] = useState<ViewState>({ state: "checking" });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const poll = async () => {
      const result = await fetchConnection(controller.signal);
      if (!controller.signal.aborted) setView(result);
    };
    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  async function recheck() {
    setRefreshing(true);
    setView(await fetchConnection());
    setRefreshing(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backend connection</CardTitle>
        <CardDescription>Live status of the BuildScope API and its database.</CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void recheck()}
            disabled={refreshing}
            aria-label="Re-check backend connection"
          >
            <RefreshCw className={refreshing ? "animate-spin" : undefined} />
            Re-check
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <StatusBody view={view} />
      </CardContent>
    </Card>
  );
}

function StatusBody({ view }: { view: ViewState }) {
  if (view.state === "checking") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Checking backend…
      </p>
    );
  }

  if (view.state === "unreachable") {
    return (
      <div role="status" className="space-y-1">
        <Badge variant="destructive">
          <XCircle /> Disconnected
        </Badge>
        <p className="text-sm text-muted-foreground">{view.reason}</p>
      </div>
    );
  }

  const { health } = view;
  const healthy = health.status === "ok";
  return (
    <div role="status" className="space-y-4">
      <Badge variant={healthy ? "success" : "warning"}>
        {healthy ? <CheckCircle2 /> : <XCircle />}
        {healthy ? "Connected" : "Connected — degraded"}
      </Badge>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <Detail label="Service" value={health.service} />
        <Detail label="Version" value={health.version} />
        <Detail label="Environment" value={health.environment} />
        {Object.entries(health.checks).map(([name, status]) => (
          <Detail
            key={name}
            label={capitalize(name)}
            value={status === "ok" ? "Healthy" : "Unavailable"}
          />
        ))}
      </dl>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
