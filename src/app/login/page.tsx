import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { CardIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <CardIcon className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">NFC Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">Administrator sign-in</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Students and staff do not sign in. Their card is the credential.
        </p>
      </div>
    </main>
  );
}
