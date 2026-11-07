import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "AcademicIQ – Intelligent Personalized Learning & Academic Progress Management",
  description: "RAG-Based Question Explainer, YouTube Video Learning, and Academic Progress Management SaaS Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F7F7FA] text-[#17172B] font-sans selection:bg-[#BFBFDB] selection:text-[#0D1445]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
