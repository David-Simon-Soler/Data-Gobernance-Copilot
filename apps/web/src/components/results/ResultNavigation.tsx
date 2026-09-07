"use client";

import { useEffect, useRef, useState } from "react";

const LINKS = [
  ["overview", "Overview"],
  ["quality", "Quality"],
  ["governance", "Governance"],
  ["recommendations", "Recommendations"],
  ["columns", "Columns"],
] as const;

type SectionId = (typeof LINKS)[number][0];

export function ResultNavigation() {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const navigation = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const order = new Map(LINKS.map(([id], index) => [id, index]));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(
            (entry): entry is IntersectionObserverEntry & { target: HTMLElement } =>
              entry.isIntersecting && order.has(entry.target.id as SectionId),
          )
          .sort(
            (left, right) =>
              right.intersectionRatio - left.intersectionRatio ||
              (order.get(left.target.id as SectionId) ?? 0) -
                (order.get(right.target.id as SectionId) ?? 0),
          );
        const next = visible[0]?.target.id as SectionId | undefined;
        if (next) setActiveSection(next);
      },
      {
        rootMargin: "-15% 0px -70% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const [id] of LINKS) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const activeLink = navigation.current?.querySelector<HTMLAnchorElement>(
      `[href="#${activeSection}"]`,
    );
    const container = navigation.current;
    if (activeLink && container) {
      const left =
        activeLink.offsetLeft -
        container.clientWidth / 2 +
        activeLink.clientWidth / 2;
      container.scrollTo?.({ left: Math.max(0, left) });
    }
  }, [activeSection]);

  return (
    <nav ref={navigation} className="result-nav" aria-label="Result sections">
      {LINKS.map(([id, title]) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={activeSection === id ? "location" : undefined}
          onClick={() => setActiveSection(id)}
        >
          {title}
        </a>
      ))}
    </nav>
  );
}
