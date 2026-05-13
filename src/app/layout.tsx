import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinancePro",
  description: "KI-Rechnungsagent für österreichische Unternehmen"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
