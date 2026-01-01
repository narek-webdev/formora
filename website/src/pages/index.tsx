import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";

type FeatureItem = {
  title: string;
  description: string;
};

const FEATURES: FeatureItem[] = [
  {
    title: "Predictable validation",
    description:
      "Clear separation between validation and UI. submit / change / blur modes without hacks.",
  },
  {
    title: "Async-safe by design",
    description:
      "Built-in stale protection, debouncing, and validating state that never lies.",
  },
  {
    title: "Field arrays done right",
    description:
      "Move, swap, insert, remove — values and meta always stay aligned.",
  },
];

function HeroButtons({
  githubUrl,
  npmUrl,
}: {
  githubUrl: string;
  npmUrl: string;
}) {
  return (
    <div className={styles.buttons}>
      <Link
        className={clsx("button button--primary button--lg", styles.btn)}
        to="/docs/intro"
      >
        Get Started
      </Link>
      <Link
        className={clsx("button button--secondary button--lg", styles.btn)}
        to="/docs/getting-started"
      >
        Read the Docs
      </Link>
      <Link
        className={clsx("button button--secondary button--lg", styles.btn)}
        href={npmUrl}
      >
        npm
      </Link>
      <Link
        className={clsx("button button--outline button--lg", styles.btnOutline)}
        href={githubUrl}
      >
        GitHub
      </Link>
    </div>
  );
}

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  // Replace this with your real repo URL when ready.
  const githubUrl =
    (siteConfig.customFields?.githubUrl as string | undefined) ??
    "https://github.com/narek-webdev/formora";

  const npmUrl =
    (siteConfig.customFields?.npmUrl as string | undefined) ??
    "https://www.npmjs.com/package/formora";

  return (
    <header className={clsx("hero", styles.heroBanner)}>
      <div className={clsx("container", styles.heroContainer)}>
        <div className={styles.heroContent}>
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>

          <HeroButtons githubUrl={githubUrl} npmUrl={npmUrl} />

          <p className={styles.heroNote}>
            Tiny core. Strict typing. Reliable async + field arrays.
          </p>
        </div>
      </div>
    </header>
  );
}

function Feature({ title, description }: FeatureItem) {
  return (
    <div className="col col--4">
      <div className={styles.featureCard}>
        <Heading as="h3" className={styles.featureTitle}>
          {title}
        </Heading>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={clsx("row", styles.featureRow)}>
          {FEATURES.map((f) => (
            <Feature
              key={f.title}
              title={f.title}
              description={f.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description="Formora is a tiny form engine for predictable validation and robust form state management."
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
