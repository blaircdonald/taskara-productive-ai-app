import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";
import "@liveblocks/react-ui/styles.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Taskara",
  description: "A cozy productivity workspace for tasks, notes, whiteboards, and AI-assisted planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, padding: 0 }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
