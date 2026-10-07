export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <p className="text-center text-lg font-semibold tracking-tight">BuildScope</p>
        {children}
      </div>
    </main>
  );
}
