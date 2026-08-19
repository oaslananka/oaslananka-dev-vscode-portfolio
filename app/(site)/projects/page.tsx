import type { Metadata } from 'next';
import { VscFolderOpened, VscGithub, VscLinkExternal } from '@/components/UiIcons';

import ContentDomainGrid from '@/components/ContentDomainGrid';
import JsonLd from '@/components/JsonLd';
import ProjectCard from '@/components/ProjectCard';
import { getProjects, getPublishedPosts } from '@/lib/content';
import { breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site-config';
import { GITHUB_USERNAME } from '@/lib/site-config';
import styles from '@/styles/ProjectsPage.module.css';

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: 'Edge AI, Embedded & AI Engineering Projects',
  description:
    'Engineering case studies by Osman Aslan across edge AI, computer vision, embedded systems, sensor drivers, device-to-cloud platforms and AI-assisted EDA.',
  path: '/projects',
});

export default async function ProjectsPage() {
  const [projects, posts] = await Promise.all([
    getProjects(),
    getPublishedPosts(),
  ]);
  const featuredProjects = projects.filter((project) => project.featured);
  const otherProjects = projects.filter((project) => !project.featured);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${absoluteUrl('/projects')}#item-list`,
    name: 'Selected engineering projects',
    itemListElement: projects.map((project, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SoftwareSourceCode',
        '@id': `${absoluteUrl(`/projects/${project.slug}`)}#software`,
        name: project.title,
        description: project.description,
        url: absoluteUrl(`/projects/${project.slug}`),
      },
    })),
  };

  return (
    <div className={styles.page}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
        ])}
      />
      <JsonLd data={itemListJsonLd} />
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.iconWrapper}>
              <VscFolderOpened className={styles.icon} size={24} />
            </div>
            <div className={styles.meta}>
              <span className={styles.count}>{projects.length} Projects</span>
            </div>
          </div>

          <div className={styles.headerContent}>
            <h1 className={styles.title}>Engineering case studies</h1>
            <p className={styles.subtitle}>
              Selected systems across AI-assisted EDA, edge computer vision,
              embedded drivers and device-to-cloud infrastructure. Each case
              study documents my role, design boundaries and verifiable output.
            </p>
          </div>
        </header>

        <ContentDomainGrid
          projects={projects}
          posts={posts}
          headingId="project-domains-title"
        />

        {featuredProjects.length > 0 ? (
          <section
            className={styles.section}
            aria-labelledby="featured-projects-title"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.sectionEyebrow}>Selected work</p>
                <h2 id="featured-projects-title" className={styles.sectionTitle}>
                  Flagship case studies
                </h2>
              </div>
              <p className={styles.sectionCopy}>
                Product surfaces and engineering evidence, not placeholder
                concepts.
              </p>
            </div>
            <div className={styles.featuredGrid}>
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
        ) : null}

        {otherProjects.length > 0 ? (
          <section
            className={styles.section}
            aria-labelledby="more-projects-title"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.sectionEyebrow}>More systems</p>
                <h2 id="more-projects-title" className={styles.sectionTitle}>
                  Open engineering work
                </h2>
              </div>
            </div>
            <div className={styles.timeline}>
              {otherProjects.map((project, index) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  index={featuredProjects.length + index + 1}
                  headingLevel={3}
                />
              ))}
            </div>
          </section>
        ) : null}

        <footer className={styles.footer}>
          <div className={styles.footerLine} />
          <a
            href={`https://github.com/${GITHUB_USERNAME}?tab=repositories`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            <VscGithub size={18} />
            <span>Explore more on GitHub</span>
            <VscLinkExternal size={14} />
          </a>
        </footer>
      </div>
    </div>
  );
}
