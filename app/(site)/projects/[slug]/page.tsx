import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  VscArrowLeft,
  VscCheck,
  VscGithub,
  VscLinkExternal,
} from '@/components/UiIcons';

import ArticleCard from '@/components/ArticleCard';
import JsonLd from '@/components/JsonLd';
import MarkdownContent from '@/components/MarkdownContent';
import ProjectCard from '@/components/ProjectCard';
import ProjectMediaGallery from '@/components/ProjectMediaGallery';
import {
  getProfile,
  getProjects,
  getProjectBySlug,
  getPublishedPosts,
} from '@/lib/content';
import { relatedPostsForProject } from '@/lib/content-relations';
import {
  breadcrumbJsonLd,
  buildPageMetadata,
  projectJsonLd,
} from '@/lib/seo';
import { isSafeHttpsUrl } from '@/lib/url-policy';
import styles from '@/styles/ProjectDetailPage.module.css';

export const revalidate = 3600;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return buildPageMetadata({
    title: project.title,
    description: project.description,
    path: `/projects/${slug}`,
    useFileConventionImage: true,
  });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const [profile, projects, posts] = await Promise.all([
    getProfile(),
    getProjects(),
    getPublishedPosts(),
  ]);

  const externalLinks = [
    ...(project.repo
      ? [{ type: 'source' as const, label: 'Source repository', url: project.repo }]
      : []),
    ...project.links,
    ...(project.link
      ? [{ type: 'demo' as const, label: 'Live demo', url: project.link }]
      : []),
  ].filter(
    (link, index, links) =>
      isSafeHttpsUrl(link.url) &&
      links.findIndex((candidate) => candidate.url === link.url) === index,
  );

  const relatedProjects = projects
    .filter((candidate) => candidate.slug !== project.slug)
    .map((candidate) => ({
      project: candidate,
      score:
        candidate.tags.filter((tag) => project.tags.includes(tag)).length +
        (candidate.featured ? 1 : 0),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.project.sortOrder - right.project.sortOrder,
    )
    .slice(0, 2)
    .map((item) => item.project);

  const relatedPosts = relatedPostsForProject(project, posts, 3);

  const coverMedia = project.media.find(
    (item) => item.type === 'image' && item.src === project.coverImage,
  );

  return (
    <div className={styles.page}>
      <JsonLd data={projectJsonLd(project, profile)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Projects', path: '/projects' },
          { name: project.title, path: `/projects/${slug}` },
        ])}
      />
      <article className={styles.container}>
        <Link href="/projects" className={styles.back}>
          <VscArrowLeft size={16} aria-hidden="true" />
          <span>All projects</span>
        </Link>

        <header className={styles.header}>
          {project.role ? (
            <p className={styles.eyebrow}>{project.role}</p>
          ) : null}
          <h1 className={styles.title}>{project.title}</h1>
          <p className={styles.summary}>{project.description}</p>

          <div className={styles.meta}>
            {project.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>

          {externalLinks.length > 0 ? (
            <div className={styles.actions} aria-label="Project resources">
              {externalLinks.map((resource) => (
              <a
                key={resource.url}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.action}
              >
                {resource.type === 'source' ? (
                  <VscGithub size={17} aria-hidden="true" />
                ) : (
                  <VscLinkExternal size={16} aria-hidden="true" />
                )}
                <span>{resource.label}</span>
              </a>
              ))}
            </div>
          ) : null}
        </header>

        {project.coverImage ? (
          <figure className={styles.cover}>
            <Image
              src={project.coverImage}
              alt={
                project.coverImageAlt ||
                `${project.title} project interface and workflow`
              }
              width={coverMedia?.width ?? 1600}
              height={coverMedia?.height ?? 900}
              sizes="(max-width: 900px) 100vw, 1120px"
              priority
              className={styles.coverImage}
              unoptimized={project.coverImage.endsWith('.svg')}
            />
          </figure>
        ) : null}

        {project.outcomes.length > 0 || project.longDescription ? (
          <div
            className={`${styles.contentGrid} ${
              !project.longDescription ? styles.outcomesOnly : ''
            }`}
          >
            {project.outcomes.length > 0 ? (
              <aside
                className={styles.outcomes}
                aria-labelledby="project-outcomes-title"
              >
                <p className={styles.sectionEyebrow}>Verified scope</p>
                <h2 id="project-outcomes-title" className={styles.outcomesTitle}>
                  Engineering outcomes
                </h2>
                <ul className={styles.outcomesList}>
                  {project.outcomes.map((outcome) => (
                    <li key={outcome}>
                      <VscCheck aria-hidden="true" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}

            {project.longDescription ? (
              <div className={styles.caseStudy}>
                <p className={styles.sectionEyebrow}>Case study</p>
                <div className={styles.prose}>
                  <MarkdownContent>{project.longDescription}</MarkdownContent>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <ProjectMediaGallery
          media={project.media}
          coverImage={project.coverImage}
        />

        {relatedPosts.length > 0 ? (
          <section
            className={styles.related}
            aria-labelledby="related-articles-title"
          >
            <header className={styles.relatedHeader}>
              <p className={styles.sectionEyebrow}>Implementation notes</p>
              <h2 id="related-articles-title" className={styles.relatedTitle}>
                Related technical articles
              </h2>
              <p className={styles.relatedCopy}>
                Deeper explanations of the architecture, verification strategy
                and engineering trade-offs behind this project.
              </p>
            </header>
            <div className={styles.relatedArticleList}>
              {relatedPosts.map((post, index) => (
                <ArticleCard
                  key={post.slug}
                  post={post}
                  index={index + 1}
                  headingLevel={3}
                />
              ))}
            </div>
          </section>
        ) : null}

        {relatedProjects.length > 0 ? (
          <section
            className={styles.related}
            aria-labelledby="related-projects-title"
          >
            <header className={styles.relatedHeader}>
              <p className={styles.sectionEyebrow}>Continue exploring</p>
              <h2 id="related-projects-title" className={styles.relatedTitle}>
                Related engineering work
              </h2>
            </header>
            <div className={styles.relatedGrid}>
              {relatedProjects.map((relatedProject, index) => (
                <ProjectCard
                  key={relatedProject.slug}
                  project={relatedProject}
                  index={index + 1}
                  headingLevel={3}
                />
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}
