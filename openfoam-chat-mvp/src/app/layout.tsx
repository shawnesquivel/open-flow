import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "OpenFOAM Chat MVP",
  description: "Single-user Claude + OpenFOAM chat runner"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
