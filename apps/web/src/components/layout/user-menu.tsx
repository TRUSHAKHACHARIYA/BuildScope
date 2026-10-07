import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getCurrentUser } from "@/lib/auth/session";

export async function UserMenu() {
  const user = await getCurrentUser();
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right text-sm leading-tight sm:block">
        <p className="font-medium">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
      <SignOutButton />
    </div>
  );
}
