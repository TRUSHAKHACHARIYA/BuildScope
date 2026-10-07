import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signInEmail = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("@/lib/auth/client", () => ({
  authClient: { signIn: { email: (values: unknown) => signInEmail(values) } },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
  useSearchParams: () => searchParams,
}));

const { LoginForm } = await import("./login-form");

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("Email"), email);
  if (password) await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    signInEmail.mockReset();
    replace.mockReset();
    searchParams = new URLSearchParams();
  });

  it("validates before calling the auth server", async () => {
    render(<LoginForm />);

    await fillAndSubmit("not-an-email", "");

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("signs in and goes to the requested page", async () => {
    searchParams = new URLSearchParams({ next: "/projects" });
    signInEmail.mockResolvedValue({ error: null });
    render(<LoginForm />);

    await fillAndSubmit("Ada@Example.com", "correct-horse");

    expect(signInEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "correct-horse",
    });
    expect(replace).toHaveBeenCalledWith("/projects");
  });

  it("ignores unsafe redirect targets", async () => {
    searchParams = new URLSearchParams({ next: "https://evil.example" });
    signInEmail.mockResolvedValue({ error: null });
    render(<LoginForm />);

    await fillAndSubmit("ada@example.com", "correct-horse");

    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("shows a friendly error for bad credentials", async () => {
    signInEmail.mockResolvedValue({ error: { code: "INVALID_EMAIL_OR_PASSWORD", status: 401 } });
    render(<LoginForm />);

    await fillAndSubmit("ada@example.com", "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(replace).not.toHaveBeenCalled();
  });
});
