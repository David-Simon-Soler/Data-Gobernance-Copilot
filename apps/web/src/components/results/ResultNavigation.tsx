"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageProvider";

const SECTION_IDS = ["overview", "quality", "governance", "recommendations", "columns"] as const;

type SectionId = (typeof SECTION_IDS)[number];

interface ResultNavigationProps {
  datasetName: string;
  sourceFormat: string;
  overallScore: number | null;
}

export function ResultNavigation({
  datasetName,
  sourceFormat,
  overallScore,
}: ResultNavigationProps) {
  const { messages } = useLanguage();
  const links = SECTION_IDS.map((id) => [id, messages[id]] as const);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const navigation = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const order = new Map(SECTION_IDS.map((id, index) => [id, index]));
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

    for (const id of SECTION_IDS) {
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
    <div className="analysis-nav-shell">
      <div className="analysis-nav-inner">
        <p className="compact-dataset-context" aria-label={messages.currentDataset}>
          <span className="compact-dataset-identity">
            <strong title={datasetName}>{datasetName}</strong>
            <span className="compact-separator" aria-hidden="true">·</span>
            <span>{sourceFormat.toUpperCase()}</span>
          </span>
          <span className="compact-quality">
            {overallScore == null
              ? messages.naQuality
              : `${overallScore} / 100 ${messages.qualitySuffix}`}
          </span>
        </p>
        <nav ref={navigation} className="result-nav" aria-label={messages.resultSections}>
          {links.map(([id, title]) => (
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
      </div>
    </div>
  );
}
