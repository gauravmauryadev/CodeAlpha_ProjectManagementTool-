import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GoogleProvider from "@/components/providers/GoogleProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OmniPlan — The Ultimate Workspace for Modern Teams",
  description: "Combine Kanban boards, Discord-style chat, and video calls in one powerful workspace. Built for teams who ship fast.",
  keywords: ["project management", "kanban", "team chat", "video calls", "saas", "collaboration", "omniplan"],
  authors: [{ name: "Gaurav Maurya" }],
  openGraph: {
    title: "OmniPlan - Team Collaboration Platform",
    description: "Manage projects, chat, and call — all from one dashboard.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-white font-sans">
        <GoogleProvider>
          {children}
        </GoogleProvider>
      </body>
    </html>
  );
}
