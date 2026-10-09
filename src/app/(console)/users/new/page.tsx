import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Register user" };

export default async function NewUserPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="Register user"
        description={
          <>
            Enter the details, then present a blank card to bind it.{" "}
            <Link href="/users" className="text-indigo-600 hover:underline">
              Back to users
            </Link>
          </>
        }
      />
      <RegisterForm />
    </>
  );
}
