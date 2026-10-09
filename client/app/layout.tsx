import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/auth-context";
import "./globals.css";
export const metadata: Metadata = {
  title: "1C · Billboard asset management",
  description: "Billboard condition, maintenance and photographs.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
