import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090b] p-4">
      <ClerkLoading>
        <AuthLoading label="Opening sign in..." />
      </ClerkLoading>
      <ClerkLoaded>
        <SignIn forceRedirectUrl="/sync-user" />
      </ClerkLoaded>
    </main>
  );
}

function AuthLoading({ label }: { label: string }) {
  return <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-8 text-center shadow-2xl"><span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-[#a54f36]" /><h1 className="mt-5 text-lg font-semibold text-stone-900">{label}</h1><p className="mt-2 text-sm text-stone-500">Taskara is connecting securely. This may take a moment.</p></div>;
}
