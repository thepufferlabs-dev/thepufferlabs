"use client";

import { useEffect, useRef, useState } from "react";

interface SkillCategory {
  label: string;
  skills: string[];
}

const categories: SkillCategory[] = [
  {
    label: "Languages",
    skills: ["C#", "TypeScript", "JavaScript", "Python", "SQL"],
  },
  {
    label: "Frontend",
    skills: ["React", "Angular", "Next.js", "Tailwind CSS", "HTML/CSS"],
  },
  {
    label: "Backend",
    skills: [".NET Core", "ASP.NET", "Node.js", "GraphQL", "gRPC"],
  },
  {
    label: "Cloud & Infra",
    skills: ["Azure", "AWS", "Kubernetes", "KEDA", "Docker", "Nginx"],
  },
  {
    label: "Data & Messaging",
    skills: ["Kafka", "RabbitMQ", "CosmosDB", "Redis", "Elasticsearch", "Databricks"],
  },
  {
    label: "DevOps & Testing",
    skills: ["Cypress", "Azure DevOps", "GitLab CI", "Grafana", "Datadog", "Dynatrace"],
  },
  {
    label: "Architecture",
    skills: ["Microservices", "CQRS", "Event Sourcing", "DDD", "System Design"],
  },
  {
    label: "Practices",
    skills: ["TDD", "SOLID", "CI/CD", "Code Reviews", "Agile", "Mentoring"],
  },
];

export default function SkillsGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto"
    >
      {categories.map((cat, i) => (
        <div
          key={cat.label}
          className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-700 hover:border-teal/15 hover:bg-white/[0.04] ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: `${i * 80}ms` }}
        >
          <h3 className="text-xs font-mono uppercase tracking-wider text-teal/70 mb-3">
            {cat.label}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {cat.skills.map((skill) => (
              <span
                key={skill}
                className="px-2 py-1 text-[11px] rounded-md bg-white/5 text-text-muted font-mono"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
