"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DEMO_MODE, useCardReader } from "@/components/useCardReader";
import { CardIcon } from "@/components/icons";
import { buttonClass, inputClass } from "@/components/ui";

type Config = { terminalId: string; key: string };
type TapResult = {
  ok: boolean;
  outcome?: string;
  message: string;
  name?: string;
  identifier?: string;
};

const STORAGE_KEY = "attendance-terminal";
const RESULT_MS = 4000;
const SAME_CARD_DEBOUNCE_MS = 3000;

// The terminal's identity lives in this browser, so a kiosk survives a reload.
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedConfig: Config | null = null;
let memoryRaw: string | null = null; // used when storage is blocked
const configStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  get(): Config | null {
    let raw = memoryRaw;
    try {
      raw = localStorage.getItem(STORAGE_KEY) ?? memoryRaw;
    } catch {}
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try {
        cachedConfig = raw ? (JSON.parse(raw) as Config) : null;
      } catch {
        cachedConfig = null;
      }
    }
    return cachedConfig;
  },
  set(config: Config) {
    memoryRaw = JSON.stringify(config);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {}
    listeners.forEach((l) => l());
  },
};

function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
    osc.onended = () => ctx.close();
  } catch {}
}

export function Terminal() {
  const config = useSyncExternalStore(configStore.subscribe, configStore.get, () => null);
  const mounted = useSyncExternalStore(configStore.subscribe, () => true, () => false);
  const [running, setRunning] = useState(false);

  if (!mounted) return <Shell />;
  if (!config || !running) {
    return (
      <Setup
        initial={config}
        onStart={(c) => {
          configStore.set(c);
          setRunning(true);
        }}
      />
    );
  }
  return <Running config={config} onExit={() => setRunning(false)} />;
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-slate-900 text-white">{children}</main>
  );
}

function Setup({ initial, onStart }: { initial: Config | null; onStart: (c: Config) => void }) {
  return (
    <Shell>
      <div className="m-auto w-full max-w-sm px-4">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500">
            <CardIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Attendance terminal</h1>
            <p className="text-sm text-slate-400">Set this device up once per venue.</p>
          </div>
        </div>
        <form
          className="space-y-4 rounded-lg bg-white p-5 text-slate-900"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onStart({
              terminalId: String(fd.get("terminalId")).trim().toUpperCase(),
              key: String(fd.get("key") ?? ""),
            });
          }}
        >
          <div>
            <label htmlFor="terminalId" className="mb-1 block text-sm font-medium">
              Terminal ID
            </label>
            <input
              id="terminalId"
              name="terminalId"
              required
              maxLength={20}
              defaultValue={initial?.terminalId}
              placeholder="LT-1"
              className={`${inputClass} uppercase`}
            />
            <p className="mt-1 text-xs text-slate-500">Must match the terminal named on the session.</p>
          </div>
          <div>
            <label htmlFor="key" className="mb-1 block text-sm font-medium">
              Terminal key
            </label>
            <input
              id="key"
              name="key"
              type="password"
              defaultValue={initial?.key}
              placeholder="Only if the server requires one"
              className={inputClass}
            />
          </div>
          <button className={`${buttonClass} w-full`}>Start terminal</button>
        </form>
      </div>
    </Shell>
  );
}

function Running({ config, onExit }: { config: Config; onExit: () => void }) {
  const [result, setResult] = useState<TapResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const lastTap = useRef<{ uid: string; at: number } | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busyRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => clearTimeout(clearTimer.current), []);

  const submit = useCallback(
    async (rawUid: string) => {
      const uid = rawUid.replace(/[\s:-]/g, "").toUpperCase();
      const t = Date.now();
      // Readers can report one tap more than once; the server would refuse
      // the repeat anyway, but the user should see the first answer.
      if (lastTap.current?.uid === uid && t - lastTap.current.at < SAME_CARD_DEBOUNCE_MS) return;
      if (busyRef.current) return;
      lastTap.current = { uid, at: t };
      busyRef.current = true;
      setBusy(true);

      let next: TapResult;
      try {
        const res = await fetch("/api/tap", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-terminal-key": config.key },
          body: JSON.stringify({ cardUid: uid, terminalId: config.terminalId }),
        });
        const data = await res.json();
        next = res.ok ? data : { ok: false, message: data.error ?? "The server refused the tap." };
      } catch {
        next = { ok: false, message: "Cannot reach the server. Try again." };
      }

      busyRef.current = false;
      setBusy(false);
      setResult(next);
      beep(next.ok);
      clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => setResult(null), RESULT_MS);
    },
    [config],
  );

  const { nfcState, nfcError } = useCardReader(true, submit);

  const bg = result ? (result.ok ? "bg-emerald-600" : "bg-red-600") : "bg-slate-900";

  return (
    <main className={`flex min-h-screen flex-col text-white transition-colors duration-300 ${bg}`}>
      <header className="flex items-center justify-between px-6 py-4 text-sm text-white/70">
        <span>
          Terminal <span className="font-mono font-semibold text-white">{config.terminalId}</span>
        </span>
        <span className="font-mono tabular-nums">{now.toLocaleTimeString()}</span>
      </header>

      <section className="m-auto max-w-2xl px-6 text-center" aria-live="assertive">
        {result ? (
          result.ok ? (
            <>
              <div className="text-2xl font-medium text-white/80">Welcome</div>
              <div className="mt-2 text-5xl font-bold sm:text-6xl">{result.name}</div>
              {result.identifier && <div className="mt-2 font-mono text-lg text-white/80">{result.identifier}</div>}
              <div className="mt-6 text-2xl">{result.message}</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-medium text-white/80">Not recorded</div>
              <div className="mt-2 text-5xl font-bold sm:text-6xl">{result.message}</div>
              {result.name && <div className="mt-4 text-xl text-white/80">{result.name}</div>}
              {result.outcome === "unrecognised" && (
                <div className="mt-6 text-lg text-white/80">Please see the administrator.</div>
              )}
            </>
          )
        ) : (
          <>
            <CardIcon className={`mx-auto h-28 w-28 ${busy ? "animate-pulse" : ""}`} />
            <div className="mt-6 text-4xl font-semibold sm:text-5xl">
              {busy ? "Checking…" : "Present your card"}
            </div>
            <div className="mt-3 text-lg text-white/60">Hold it against the reader until you see your name.</div>
          </>
        )}
      </section>

      <footer className="space-y-3 px-6 py-4 text-xs text-white/50">
        {DEMO_MODE && (
          <form
            data-reader-ignore
            className="mx-auto flex max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("uid") as HTMLInputElement;
              if (input.value.trim()) submit(input.value);
              input.value = "";
            }}
          >
            <input
              name="uid"
              aria-label="Simulated card UID"
              placeholder="Demo: type a card UID and press Enter"
              className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 font-mono text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </form>
        )}
        <div className="flex items-center justify-between">
          <span>
            {nfcState === "scanning"
              ? "USB reader and phone NFC ready"
              : nfcError
                ? `USB reader ready · NFC: ${nfcError}`
                : "USB reader ready"}
          </span>
          <button onClick={onExit} className="underline hover:text-white">
            Settings
          </button>
        </div>
      </footer>
    </main>
  );
}
