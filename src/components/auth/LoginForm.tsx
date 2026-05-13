"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          login: formData.get("login"),
          password: formData.get("password")
        })
      });
      const payload = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) {
        setError(payload.error ?? "Login fehlgeschlagen.");
        return;
      }
      router.replace(payload.redirectTo ?? "/app/inbox");
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-ink-700" htmlFor="login">
          Benutzername oder E-Mail
        </label>
        <input
          id="login"
          name="login"
          autoComplete="username"
          className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus:border-trust-500"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-ink-700" htmlFor="password">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus:border-trust-500"
          required
        />
      </div>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <button
        type="submit"
        disabled={isPending}
        className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-ink-800 disabled:bg-ink-300"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Anmelden ..." : "Anmelden"}
      </button>
    </form>
  );
}
