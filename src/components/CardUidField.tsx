"use client";

import { useState } from "react";
import { DEMO_MODE, useCardReader } from "./useCardReader";
import { CardIcon } from "./icons";
import { inputClass, secondaryButtonClass } from "./ui";

/**
 * Captures a card UID for a form by reading it from a presented card.
 * Submits as a hidden `cardUid` field.
 */
export function CardUidField({ name = "cardUid" }: { name?: string }) {
  const [listening, setListening] = useState(false);
  const [uid, setUid] = useState("");

  const { nfcState, nfcError } = useCardReader(listening, (value) => {
    setUid(value.replace(/[\s:-]/g, "").toUpperCase());
    setListening(false);
  });

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={uid} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => setListening((v) => !v)}
          aria-pressed={listening}
        >
          <CardIcon />
          {listening ? "Cancel" : uid ? "Read a different card" : "Read card"}
        </button>
        <div className="text-sm" aria-live="polite">
          {listening ? (
            <span className="flex items-center gap-2 text-indigo-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
              Present the card to the reader…
            </span>
          ) : uid ? (
            <span className="font-mono text-slate-900">{uid}</span>
          ) : (
            <span className="text-slate-500">No card read</span>
          )}
        </div>
      </div>
      {listening && nfcState === "scanning" && (
        <p className="text-xs text-slate-500">Phone NFC is listening as well.</p>
      )}
      {nfcError && <p className="text-xs text-amber-700">{nfcError}</p>}
      {DEMO_MODE && (
        <input
          data-reader-ignore
          aria-label="Card UID (demo entry)"
          placeholder="Demo mode: type a UID, e.g. 04A23B1C"
          className={`${inputClass} font-mono`}
          value={uid}
          onChange={(e) => setUid(e.target.value.replace(/[\s:-]/g, "").toUpperCase())}
        />
      )}
    </div>
  );
}
