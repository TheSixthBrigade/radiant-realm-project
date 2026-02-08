import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { EnterpriseLayout } from "@/components/layout/EnterpriseLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProjectProvider } from "@/hooks/useProject";

const inter = Inter({ subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: "Vectabase | The Private Hub",
  description: "Secure Database Orchestration.",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={jetbrainsMono.variable}>
        <ErrorBoundary>
          <ProjectProvider>
            <EnterpriseLayout>
              {children}
            </EnterpriseLayout>
          </ProjectProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
