import type { Metadata } from "next";
import { Terminal } from "./Terminal";

export const metadata: Metadata = { title: "Attendance terminal" };

export default function TerminalPage() {
  return <Terminal />;
}
