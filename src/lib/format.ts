const timeZone = process.env.APP_TIMEZONE || undefined;

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone,
});
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone });
const timeSecondsFmt = new Intl.DateTimeFormat("en-GB", { timeStyle: "medium", timeZone });

export const fmtDateTime = (d: Date | string | null | undefined) =>
  d ? dateTimeFmt.format(new Date(d)) : "—";
export const fmtTime = (d: Date | string) => timeFmt.format(new Date(d));
export const fmtTimeSeconds = (d: Date | string) => timeSecondsFmt.format(new Date(d));

export function sessionState(s: { opensAt: Date; closesAt: Date }, now = new Date()) {
  if (now < s.opensAt) return "scheduled" as const;
  if (now > s.closesAt) return "closed" as const;
  return "open" as const;
}
