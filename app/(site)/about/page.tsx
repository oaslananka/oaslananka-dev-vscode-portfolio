import type { Metadata } from 'next';
import Link from 'next/link';
import {
  VscArrowRight,
  VscGithub,
  VscLinkExternal,
  VscMail,
} from '@/components/UiIcons';

import JsonLd from '@/components/JsonLd';
import { getProfile } from '@/lib/content';
import {
  personIdentityStatement,
  publicIdentityProfiles,
} from '@/lib/person-identity';
import { SITE_URL } from '@/lib/site-config';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  profilePageJsonLd,
} from '@/lib/seo';
import { isSafeHttpsUrl } from '@/lib/url-policy';
import styles from '@/styles/AboutPage.module.css';

type ExternalAboutLinkProps = Readonly<{
  href: string;
  rel?: string;
  children: React.ReactNode;
}>;

type AboutSectionProps = Readonly<{
  children: React.ReactNode;
}>;

function AboutSectionBody({ children }: AboutSectionProps) {
  return <div className={styles.sectionBody}>{children}</div>;
}

function AboutLinkGrid({ children }: AboutSectionProps) {
  return <div className={styles.writingLinks}>{children}</div>;
}

function ExternalAboutLink({
  href,
  rel = 'noopener noreferrer',
  children,
}: ExternalAboutLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel={rel}
      className={styles.writingLink}
    >
      <span>{children}</span>
      <VscLinkExternal size={14} aria-hidden="true" />
    </a>
  );
}

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  return buildPageMetadata({
    title: `About ${profile.name} — ${profile.role}`,
    absoluteTitle: true,
    description: `About ${profile.name} — ${profile.role}. ${profile.tagline}`,
    path: '/about',
    imageAlt: `About ${profile.name}`,
  });
}

export default async function AboutPage() {
  const profile = await getProfile();
  const verifiedProfiles = publicIdentityProfiles(profile.socials);
  const identityStatement = personIdentityStatement(profile.name, profile.role);
  const github = verifiedProfiles.find(
    (social) => social.platform === 'github',
  )?.url;
  const siteOrigin = new URL(SITE_URL).origin;
  const writing = profile.writing.flatMap((item) => {
    if (!isSafeHttpsUrl(item.url)) return [];

    const url = new URL(item.url);
    const external = url.origin !== siteOrigin;
    return [{
      ...item,
      href: external ? url.toString() : `${url.pathname}${url.search}${url.hash}`,
      external,
    }];
  });

  const sections: { title: string; body: React.ReactNode }[] = [];

  sections.push({
    title: `About ${profile.name}`,
    body: (
      <AboutSectionBody>
        {profile.bio.map((p, i) => (
          <p key={i} className={styles.paragraph}>
            {p}
          </p>
        ))}
      </AboutSectionBody>
    ),
  });

  if (profile.experience.length > 0) {
    sections.push({
      title: 'Experience',
      body: (
        <AboutSectionBody>
          {profile.experience.map((exp, i) => (
            <div key={i} className={styles.experienceCard}>
              <div className={styles.expMeta}>
                <span className={styles.expPeriod}>{exp.period}</span>
              </div>
              <h3 className={styles.expRole}>{exp.role}</h3>
              {exp.company && <p className={styles.expCompany}>{exp.company}</p>}
              {exp.description && (
                <p className={styles.expDesc}>{exp.description}</p>
              )}
              {exp.points.length > 0 && (
                <ul className={styles.expList}>
                  {exp.points.map((pt, j) => (
                    <li key={j}>{pt}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </AboutSectionBody>
      ),
    });
  }

  if (profile.education.length > 0) {
    sections.push({
      title: 'Education',
      body: (
        <AboutSectionBody>
          {profile.education.map((item) => (
            <article
              key={`${item.institution}:${item.qualification}`}
              className={styles.experienceCard}
            >
              <h3 className={styles.expRole}>{item.institution}</h3>
              <p className={styles.expCompany}>{item.qualification}</p>
              {item.details ? (
                <p className={styles.expDesc}>{item.details}</p>
              ) : null}
            </article>
          ))}
        </AboutSectionBody>
      ),
    });
  }

  if (profile.skills.length > 0) {
    sections.push({
      title: 'Skills',
      body: (
        <AboutSectionBody>
          <div className={styles.skillsGrid}>
            {profile.skills.map((group, i) => (
              <div key={i} className={styles.skillCategory}>
                <h3 className={styles.skillTitle}>{group.category}</h3>
                <div className={styles.skillTags}>
                  {group.items.map((item) => (
                    <span key={item} className={styles.skillTag}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AboutSectionBody>
      ),
    });
  }

  if (verifiedProfiles.length > 0) {
    sections.push({
      title: 'Verified profiles',
      body: (
        <AboutSectionBody>
          <AboutLinkGrid>
            {verifiedProfiles.map((social) => (
              <ExternalAboutLink
                key={social.url}
                href={social.url}
                rel="me noopener noreferrer"
              >
                {profile.name} on {social.label}
              </ExternalAboutLink>
            ))}
          </AboutLinkGrid>
        </AboutSectionBody>
      ),
    });
  }

  if (writing.length > 0) {
    sections.push({
      title: 'Writing',
      body: (
        <AboutSectionBody>
          <p className={styles.paragraph}>
            Selected publications and articles I&apos;ve written:
          </p>
          <AboutLinkGrid>
            {writing.map((item) => {
              return item.external ? (
                <ExternalAboutLink key={item.url} href={item.href}>
                  {item.label}
                </ExternalAboutLink>
              ) : (
                <Link
                  key={item.url}
                  href={item.href}
                  className={styles.writingLink}
                >
                  <span>{item.label}</span>
                  <VscArrowRight size={14} aria-hidden="true" />
                </Link>
              );
            })}
          </AboutLinkGrid>
        </AboutSectionBody>
      ),
    });
  }

  return (
    <div className={styles.page}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />
      <JsonLd data={profilePageJsonLd(profile)} />
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerText}>
              <h1 className={styles.name}>{profile.name}</h1>
              <p className={styles.role}>{profile.role}</p>
              <p className={styles.identity}>{identityStatement}</p>
              {profile.location && (
                <div className={styles.location}>
                  <span className={styles.dot} />
                  {profile.location}
                </div>
              )}
            </div>
          </div>

          <div className={styles.headerActions}>
            {github && (
              <a
                href={github}
                target="_blank"
                rel="me noopener noreferrer"
                className={styles.iconButton}
                aria-label="GitHub profile"
              >
                <VscGithub size={20} />
              </a>
            )}
            <Link
              href="/contact"
              className={styles.iconButton}
              aria-label="Contact"
            >
              <VscMail size={20} />
            </Link>
          </div>
        </header>

        <div className={styles.content}>
          {sections.map((section, i) => (
            <section key={section.title} className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionNumber}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
              </div>
              {section.body}
            </section>
          ))}
        </div>

        <footer className={styles.footer}>
          <Link href="/projects" className={styles.footerLink}>
            View my projects →
          </Link>
        </footer>
      </div>
    </div>
  );
}
