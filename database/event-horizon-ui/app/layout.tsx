import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { EnterpriseLayout } from "@/components/layout/EnterpriseLayout";

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

import { ProjectProvider } from "@/hooks/useProject";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={jetbrainsMono.variable}>
        <ProjectProvider>
          <EnterpriseLayout>
            {children}
          </EnterpriseLayout>
        </ProjectProvider>
      </body>
    </html>
  );
}
