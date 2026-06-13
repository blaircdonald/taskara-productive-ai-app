import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";
import "@liveblocks/react-ui/styles.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Taskara | Your AI-Powered Productivity Workspace",
  description: "Bring notes, tasks, whiteboards, calendar planning, AI assistance, and real-time collaboration into one calm productivity workspace.",
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
