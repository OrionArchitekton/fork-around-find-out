import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fork Around & Find Out: speculative execution for agent safety",
  description:
    "Every risky agent action runs in a disposable Daytona sandbox first. We measure the blast radius, score it against a labeled attack suite, and only clear the action to run for real if it passes a fail-closed policy gate.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
