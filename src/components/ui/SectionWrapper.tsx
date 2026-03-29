import { type ReactNode } from "react";

interface SectionWrapperProps {
  id?: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

export default function SectionWrapper({
  id,
  children,
  className = "",
  containerClassName = "",
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={`relative py-24 md:py-32 ${className}`}
    >
      <div
        className={`mx-auto max-w-7xl px-6 lg:px-8 ${containerClassName}`}
      >
        {children}
      </div>
    </section>
  );
}
