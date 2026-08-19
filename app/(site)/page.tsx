import type { Metadata } from 'next';
import Link from 'next/link';
import {
  VscArrowRight,
  VscBook,
  VscBriefcase,
  VscCircuitBoard,
  VscCode,
  VscGithub,
  VscMail,
  VscPulse,
  VscServer,
} from '@/components/UiIcons';

import JsonLd from '@/components/JsonLd';
import ProjectCard from '@/components/ProjectCard';
import {
  getProfile,
  getProjects,
  getPublishedPosts,
  getSettings,
} from '@/lib/content';
import { profileAvailabilityCopy } from '@/lib/profile-content';
import { breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import {
  HOMEPAGE_DELIVERY_INTRO,
  HOMEPAGE_DELIVERY_STAGES,
  HOMEPAGE_ENGINEERING_PRINCIPLES,
} from '@/lib/homepage-content';
import { isSafeHttpsUrl } from '@/lib/url-policy';
import styles from '@/styles/HomePage.module.css';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);

  return buildPageMetadata({
    title: settings.siteTitle,
    absoluteTitle: true,
    description: settings.siteDescription || profile.tagline,
    path: '/',
    imageAlt: `${profile.name} - ${profile.role}`,
    markdownAlternate: '/index.md',
  });
}

const capabilities = [
  {
    icon: VscPulse,
    title: 'Edge AI & computer vision',
    description:
      'On-device inference, tracking and control pipelines designed around latency, hardware and operational constraints.',
  },
  {
    icon: VscCircuitBoard,
    title: 'Embedded & IoT systems',
    description:
      'Sensor-to-cloud systems spanning drivers, gateways, telemetry, backend services and deployment diagnostics.',
  },
  {
    icon: VscServer,
    title: 'AI engineering tools',
    description:
      'Inspect-first automation for hardware workflows, with explicit validation gates and human review boundaries.',
  },
] as const;

export default async function HomePage() {
  const [profile, projects, posts] = await Promise.all([
    getProfile(),
    getProjects(),
    getPublishedPosts(),
  ]);
  const github = profile.socials.find(
    (social) => social.platform === 'github' && isSafeHttpsUrl(social.url),
  )?.url;
  const selectedProjects = projects.filter((project) => project.featured).slice(0, 3);
  const featuredProjects = selectedProjects.length === 3
    ? selectedProjects
    : projects.slice(0, 3);
  const latestPosts = posts.slice(0, 2);

  return (
    <div className={styles.page}>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }])} />

      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroInner}>
          <div className={styles.eyebrowRow}>
            <span className={styles.prompt} aria-hidden="true">&gt;_</span>
            <span>{profile.greeting}</span>
            {profile.availableForWork ? (
              <span className={styles.availability}>
                <span className={styles.statusDot} aria-hidden="true" />
                {profileAvailabilityCopy(true)}
              </span>
            ) : null}
          </div>

          <h1 id="home-title" className={styles.name}>{profile.name}</h1>
          <p className={styles.role}>{profile.role}</p>
          <p className={styles.description}>{profile.heroDescription}</p>

          <div className={styles.actions}>
            <Link href="/projects" className={styles.primaryAction}>
              <span>View selected work</span>
              <VscArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/contact" className={styles.secondaryAction}>
              <VscMail size={17} aria-hidden="true" />
              <span>Start a conversation</span>
            </Link>
          </div>

          <div className={styles.heroLinks} aria-label="Profile links">
            {github ? (
              <a href={github} target="_blank" rel="noopener noreferrer">
                <VscGithub size={16} aria-hidden="true" />
                GitHub
              </a>
            ) : null}
            <Link href="/about">
              <VscBriefcase size={16} aria-hidden="true" />
              Experience
            </Link>
            <Link href="/glossary">
              <VscBook size={16} aria-hidden="true" />
              Glossary
            </Link>
            <span>{profile.location}</span>
          </div>
        </div>
      </section>

      <section className={styles.workSection} aria-labelledby="selected-work">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>Selected work</p>
            <h2 id="selected-work">Systems with visible engineering evidence</h2>
          </div>
          <Link href="/projects" className={styles.textLink}>
            All projects
            <VscArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.projectGrid}>
          {featuredProjects.map((project, index) => (
            <ProjectCard
              key={project.slug}
              project={project}
              index={index + 1}
              headingLevel={3}
              featured
            />
          ))}
        </div>
      </section>

      <section className={styles.capabilitySection} aria-labelledby="capabilities">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>How I work</p>
            <h2 id="capabilities">From device constraints to production operations</h2>
          </div>
        </div>
        <div className={styles.capabilityGrid}>
          {capabilities.map(({ icon: Icon, title, description }, index) => (
            <article key={title} className={styles.capability}>
              <div className={styles.capabilityTop}>
                <Icon size={22} aria-hidden="true" />
                <span>0{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className={styles.engineeringSection}
        aria-labelledby="production-ready"
      >
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLabel}>Engineering standard</p>
            <h2 id="production-ready">
              What production-ready means in my work
            </h2>
          </div>
        </div>
        <div className={styles.principlesGrid}>
          {HOMEPAGE_ENGINEERING_PRINCIPLES.map((principle, index) => (
            <article key={principle.title} className={styles.principle}>
              <span className={styles.principleNumber}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
              <Link href={principle.href} className={styles.textLink}>
                {principle.linkLabel}
                <VscArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
        <div className={styles.deliveryHeader}>
          <p className={styles.sectionLabel}>Delivery path</p>
          <h3>How work moves from prototype to release</h3>
          <p>{HOMEPAGE_DELIVERY_INTRO}</p>
        </div>
        <div className={styles.deliveryGrid}>
          {HOMEPAGE_DELIVERY_STAGES.map((stage) => (
            <article key={stage.order} className={styles.deliveryStage}>
              <span>{stage.order}</span>
              <h4>{stage.title}</h4>
              <p>{stage.body}</p>
            </article>
          ))}
        </div>
      </section>

      {latestPosts.length ? (
        <section className={styles.writingSection} aria-labelledby="latest-writing">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>Technical writing</p>
              <h2 id="latest-writing">Notes from the implementation layer</h2>
            </div>
            <Link href="/articles" className={styles.textLink}>
              All articles
              <VscArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.articleList}>
            {latestPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/articles/${post.slug}`}
                className={styles.articleLink}
              >
                <div>
                  <span>{post.tags[0] ?? 'Engineering'}</span>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                </div>
                <VscArrowRight size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.contactSection} aria-labelledby="contact-heading">
        <VscCode size={28} aria-hidden="true" />
        <div>
          <p className={styles.sectionLabel}>Build something dependable</p>
          <h2 id="contact-heading">Need an engineer across hardware, edge AI and cloud?</h2>
          <p>Share the system, constraints and current bottleneck. I will reply with a concrete next step.</p>
        </div>
        <Link href="/contact" className={styles.primaryAction}>
          Contact me
          <VscArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
