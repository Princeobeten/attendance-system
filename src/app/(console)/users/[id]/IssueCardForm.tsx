"use client";

import { useActionState } from "react";
import { issueCardToUser } from "@/app/actions/users";
import { CardUidField } from "@/components/CardUidField";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/ui";

export function IssueCardForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(issueCardToUser, undefined);

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-slate-600">This user holds no active card. Present a blank card to issue one.</p>
      <input type="hidden" name="userId" value={userId} />
      <CardUidField />
      {state?.ok === false && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pendingText="Issuing…">Issue card</SubmitButton>
    </form>
  );
}
