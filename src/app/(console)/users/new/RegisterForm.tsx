"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerUser, type FormResult } from "@/app/actions/users";
import { CardUidField } from "@/components/CardUidField";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, Notice, Panel, inputClass } from "@/components/ui";

export function RegisterForm() {
  const [role, setRole] = useState("student");
  const [submissions, setSubmissions] = useState(0);
  const [state, action] = useActionState(async (prev: FormResult, formData: FormData) => {
    const result = await registerUser(prev, formData);
    if (result?.ok) {
      setSubmissions((n) => n + 1);
      setRole("student");
    }
    return result;
  }, undefined);

  const values = state && !state.ok ? state.values : undefined;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-3">
      <Panel title="User details" className="lg:col-span-2">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Full name" htmlFor="fullName">
              <input id="fullName" name="fullName" required maxLength={100} defaultValue={values?.fullName} className={inputClass} />
            </Field>
          </div>
          <Field label="Matriculation / staff number" htmlFor="identifier">
            <input
              id="identifier"
              name="identifier"
              required
              maxLength={30}
              defaultValue={values?.identifier}
              className={`${inputClass} uppercase`}
            />
          </Field>
          <Field label="Department" htmlFor="department">
            <input id="department" name="department" required maxLength={80} defaultValue={values?.department} className={inputClass} />
          </Field>
          <Field label="Role" htmlFor="role">
            <select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputClass}
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="administrator">Administrator</option>
            </select>
          </Field>
          {role === "administrator" && (
            <Field label="Password" htmlFor="password" hint="At least 8 characters. Only administrators sign in.">
              <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className={inputClass} />
            </Field>
          )}
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel title="NFC card">
          <div className="space-y-3 p-5">
            <p className="text-sm text-slate-600">
              The UID is read from the card, not typed. You can also register now and issue the card later.
            </p>
            <CardUidField key={submissions} />
          </div>
        </Panel>

        {state?.ok === false && <Notice tone="error">{state.error}</Notice>}
        {state?.ok && (
          <Notice tone="success">
            {state.message}{" "}
            {state.userId && (
              <Link href={`/users/${state.userId}`} className="font-medium underline">
                View
              </Link>
            )}
          </Notice>
        )}

        <SubmitButton pendingText="Registering…">Register user</SubmitButton>
      </div>
    </form>
  );
}
