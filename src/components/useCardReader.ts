"use client";

import { useEffect, useRef, useState } from "react";

// Minimal Web NFC typings (Chrome on Android).
type NdefReadingEvent = Event & { serialNumber: string };
interface NdefReader extends EventTarget {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  onreading: ((event: NdefReadingEvent) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
}
declare global {
  interface Window {
    NDEFReader?: { new (): NdefReader };
  }
}

export type ReaderSource = "nfc" | "keyboard";
export type NfcState = "unsupported" | "starting" | "scanning" | "error";

// USB "keyboard" readers type the UID in a burst and press Enter. A person
// typing cannot keep keystrokes this close together, so a UID cannot be invented
// at the keyboard. This is the "read, not typed" rule of the design.
const MAX_KEY_GAP_MS = 60;
const MIN_UID_LENGTH = 4;

/**
 * Listens for a card while `active`: Web NFC where the browser has it, and
 * keystrokes from a keyboard-emulating USB reader everywhere.
 * Elements marked `data-reader-ignore` keep their keystrokes.
 */
export function useCardReader(active: boolean, onUid: (uid: string, source: ReaderSource) => void) {
  const onUidRef = useRef(onUid);
  useEffect(() => {
    onUidRef.current = onUid;
  }, [onUid]);

  const [nfcState, setNfcState] = useState<NfcState>("unsupported");
  const [nfcError, setNfcError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let buffer = "";
    let last = 0;

    function onKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement | null)?.closest?.("[data-reader-ignore]")) return;
      const now = performance.now();

      if (e.key === "Enter") {
        // Swallowed either way, so a stray Enter cannot press a focused button.
        e.preventDefault();
        if (buffer.length >= MIN_UID_LENGTH && now - last <= MAX_KEY_GAP_MS * 3) {
          onUidRef.current(buffer, "keyboard");
        }
        buffer = "";
        return;
      }
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;

      e.preventDefault();
      if (now - last > MAX_KEY_GAP_MS) buffer = "";
      buffer += e.key;
      last = now;
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [active]);

  useEffect(() => {
    if (!active || typeof window === "undefined" || !window.NDEFReader) return;
    const controller = new AbortController();
    const reader = new window.NDEFReader();
    reader.onreading = (event) => onUidRef.current(event.serialNumber, "nfc");
    reader.onreadingerror = () => setNfcError("The card could not be read. Try again.");

    // These updates track an external API (the NFC permission and scan), not React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNfcState("starting");
    reader
      .scan({ signal: controller.signal })
      .then(() => {
        setNfcState("scanning");
        setNfcError(null);
      })
      .catch((err: Error) => {
        if (controller.signal.aborted) return;
        setNfcState("error");
        setNfcError(err.message || "NFC is not available.");
      });

    return () => {
      controller.abort();
      setNfcState("unsupported");
    };
  }, [active]);

  return { nfcState, nfcError };
}

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
