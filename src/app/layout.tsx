import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fork Around & Find Out — speculative execution for agent safety",
  description:
    "Every risky agent action runs in a forked Daytona sandbox first. We measure the blast radius, score it, and only merge the action into the real world if it clears policy.",
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
