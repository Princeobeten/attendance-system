"use client";

import { useActionState, useRef, useState } from "react";
import { createSession } from "@/app/actions/sessions";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, Notice, inputClass } from "@/components/ui";

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time.
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionForm({ terminals }: { terminals: string[] }) {
  const opensRef = useRef<HTMLInputElement>(null);
  const closesRef = useRef<HTMLInputElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const [state, formAction] = useActionState(createSession, undefined);
  const values = state && !state.ok ? state.values : undefined;

  // Send the window as ISO timestamps so the server stores the time the admin
  // meant, whatever time zone the server runs in.
  function action(formData: FormData) {
    const opens = new Date(String(formData.get("opensLocal")));
    const closes = new Date(String(formData.get("closesLocal")));
    if (Number.isNaN(opens.getTime()) || Number.isNaN(closes.getTime())) {
      setClientError("Enter the opening and closing times.");
      return;
    }
    setClientError(null);
    formData.set("opensAt", opens.toISOString());
    formData.set("closesAt", closes.toISOString());
    formAction(formData);
  }

  function fillFromNow(minutes: number) {
    const start = new Date();
    start.setSeconds(0, 0);
    if (opensRef.current) opensRef.current.value = toLocalInput(start);
    if (closesRef.current) closesRef.current.value = toLocalInput(new Date(start.getTime() + minutes * 60_000));
  }

  const error = clientError ?? (state?.ok === false ? state.error : null);

  return (
    <form action={action} className="space-y-4 p-5">
      <Field label="Title" htmlFor="title">
        <input id="title" name="title" required maxLength={120} defaultValue={values?.title} placeholder="Data Structures lecture" className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Course code" htmlFor="courseCode">
          <input id="courseCode" name="courseCode" maxLength={20} defaultValue={values?.courseCode} placeholder="CSC 301" className={`${inputClass} uppercase`} />
        </Field>
        <Field label="Terminal" htmlFor="terminalId">
          <input
            id="terminalId"
            name="terminalId"
            required
            maxLength={20}
            list="terminal-ids"
            defaultValue={values?.terminalId}
            placeholder="LT-1"
            className={`${inputClass} uppercase`}
          />
          <datalist id="terminal-ids">
            {terminals.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
      </div>
      <Field label="Opens at" htmlFor="opensLocal">
        <input ref={opensRef} id="opensLocal" name="opensLocal" type="datetime-local" required defaultValue={values?.opensLocal} className={inputClass} />
      </Field>
      <Field label="Closes at" htmlFor="closesLocal">
        <input ref={closesRef} id="closesLocal" name="closesLocal" type="datetime-local" required defaultValue={values?.closesLocal} className={inputClass} />
      </Field>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-slate-500">Quick fill from now:</span>
        {[60, 120, 180].map((m) => (
          <button key={m} type="button" onClick={() => fillFromNow(m)} className="text-indigo-600 hover:underline">
            {m / 60}h
          </button>
        ))}
      </div>
      <Field label="Late after (minutes)" htmlFor="lateAfterMinutes" hint="Taps this long after opening are marked late. Leave empty to never mark late.">
        <input id="lateAfterMinutes" name="lateAfterMinutes" type="number" min={0} step={1} defaultValue={values?.lateAfterMinutes ?? "15"} className={inputClass} />
      </Field>

      {error && <Notice tone="error">{error}</Notice>}
      {state?.ok && <Notice tone="success">{state.message}</Notice>}

      <SubmitButton pendingText="Creating…">Create session</SubmitButton>
    </form>
  );
}
