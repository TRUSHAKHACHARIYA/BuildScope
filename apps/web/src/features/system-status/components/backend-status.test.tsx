import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { BackendConnection } from "../types";
import { BackendStatus } from "./backend-status";

function mockFetch(...results: BackendConnection[]) {
  const fetchMock = vi.fn();
  for (const result of results) {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(result), { status: 200 }));
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const connected: BackendConnection = {
  state: "connected",
  health: {
    status: "ok",
    service: "buildscope-api",
    version: "0.1.0",
    environment: "development",
    timestamp: "2026-10-07T00:00:00Z",
    checks: { database: "ok" },
  },
};

describe("BackendStatus", () => {
  it("shows connected details when the backend is healthy", async () => {
    mockFetch(connected);
    render(<BackendStatus />);

    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("buildscope-api")).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("shows a degraded state when a dependency is down", async () => {
    mockFetch({
      state: "connected",
      health: { ...connected.health, status: "degraded", checks: { database: "error" } },
    });
    render(<BackendStatus />);

    expect(await screen.findByText("Connected — degraded")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("shows the failure reason when the backend is unreachable", async () => {
    mockFetch({ state: "unreachable", reason: "Backend is not reachable" });
    render(<BackendStatus />);

    expect(await screen.findByText("Disconnected")).toBeInTheDocument();
    expect(screen.getByText("Backend is not reachable")).toBeInTheDocument();
  });

  it("re-checks on demand", async () => {
    const fetchMock = mockFetch(
      { state: "unreachable", reason: "Backend is not reachable" },
      connected,
    );
    render(<BackendStatus />);
    await screen.findByText("Disconnected");

    await userEvent.click(screen.getByRole("button", { name: /re-check/i }));

    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
