import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProjectProvider } from "@/hooks/useProject";

const inter = Inter({ subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: '--font-jetbrains-mono',
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: "Vectabase | Database Operations",
  description: "Secure Database Orchestration and Management",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}>
        <ErrorBoundary>
          <ProjectProvider>
            <div className="sidebar-layout">
              <Sidebar />
              <main className="main-content bg-[var(--bg-primary)]">
                {children}
              </main>
            </div>
          </ProjectProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}