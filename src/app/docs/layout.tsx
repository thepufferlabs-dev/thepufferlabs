import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — ThePufferLabs Docs",
    default: "Docs — ThePufferLabs",
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
