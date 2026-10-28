import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { TaskRunnerProvider } from "@/components/TaskRunner";
import { Shell } from "@/components/Shell";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Trin Co Agency",
  description: "Trin Co Agency: licensing and compliance, scouting, agents and deals.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <StoreProvider>
          <TaskRunnerProvider>
            <Shell>{children}</Shell>
          </TaskRunnerProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
