import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThePufferLabs — Expand Your Knowledge",
  description:
    "ThePufferLabs helps software engineers grow from implementation-focused work into deeper architectural, systems, and engineering thinking.",
  keywords: [
    "software engineering",
    "system design",
    "architecture",
    "consulting",
    "technical blog",
  ],
  icons: {
    icon: "/favicon.ico",
    apple: "/logos/puffer-white-lg.png",
  },
  openGraph: {
    title: "ThePufferLabs — Expand Your Knowledge",
    description:
      "Deep technical content, system design breakdowns, and consulting for engineers who think in systems.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
