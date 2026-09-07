import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Data Governance Copilot", description: "Deterministic dataset quality and governance signals" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
