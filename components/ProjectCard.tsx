import Image from 'next/image';
import Link from 'next/link';
import { VscArrowRight, VscCheck, VscCode } from '@/components/UiIcons';

import type { Project } from '@/lib/db/schema';

import styles from '@/styles/ProjectCard.module.css';

interface ProjectCardProps {
  project: Project;
  index: number;
  headingLevel?: 2 | 3;
  featured?: boolean;
}

const ProjectCard = ({
  project,
  index,
  headingLevel = 2,
  featured = false,
}: ProjectCardProps) => {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <Link
      href={`/projects/${project.slug}`}
      className={`${styles.card} ${featured ? styles.featured : ''}`}
    >
      <div className={styles.media}>
        {project.coverImage ? (
          <Image
            src={project.coverImage}
            alt={project.coverImageAlt || `${project.title} project preview`}
            fill
            priority={featured && index === 1}
            sizes={featured
              ? '(max-width: 600px) calc(100vw - 4.5rem), (max-width: 980px) calc(100vw - 11rem), (max-width: 1500px) 24vw, 330px'
              : '(max-width: 600px) calc(100vw - 4.5rem), (max-width: 760px) calc(100vw - 11rem), 300px'}
            className={styles.image}
            unoptimized={project.coverImage.endsWith('.svg')}
          />
        ) : (
          <div className={styles.mediaFallback} aria-hidden="true">
            <VscCode size={34} />
          </div>
        )}
        <span className={styles.number}>{String(index).padStart(2, '0')}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.main}>
          {project.role ? <p className={styles.role}>{project.role}</p> : null}
          <Heading className={styles.title}>{project.title}</Heading>
          <p className={styles.description}>{project.description}</p>

          {project.outcomes[0] ? (
            <p className={styles.outcome}>
              <VscCheck aria-hidden="true" />
              {project.outcomes[0]}
            </p>
          ) : null}

          {project.tags.length > 0 ? (
            <div className={styles.tags} aria-label="Technologies">
              {project.tags.slice(0, 4).map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          ) : null}
        </div>

        <span className={styles.action}>
          View case study
          <VscArrowRight size={15} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
};

export default ProjectCard;
