import Image from 'next/image';

import {
  resolveVideoAccessibility,
  type ProjectMedia,
} from '@/lib/project-content';

import styles from '@/styles/ProjectMediaGallery.module.css';

interface ProjectMediaGalleryProps {
  readonly media: readonly ProjectMedia[];
  readonly coverImage?: string;
}

function GalleryItem({
  item,
  index,
  totalCount,
}: {
  item: ProjectMedia;
  index: number;
  totalCount: number;
}) {
  const isFeatured = totalCount % 2 === 1 && index === 0;
  const videoAccessibility =
    item.type === 'video'
      ? resolveVideoAccessibility(item)
      : { audio: 'captions' as const, track: undefined };
  const captionId = `project-media-caption-${index}`;
  const silent = item.type === 'video' && videoAccessibility.audio === 'none';
  const hasCaption = Boolean(item.caption) || silent;

  return (
    <figure className={`${styles.item} ${isFeatured ? styles.featured : ''}`}>
      <div className={styles.frame}>
        {item.type === 'image' ? (
          <Image
            src={item.src}
            alt={item.alt}
            width={item.width}
            height={item.height}
            sizes={
              isFeatured
                ? '(max-width: 760px) 100vw, 1100px'
                : '(max-width: 760px) 100vw, 550px'
            }
            className={styles.image}
            unoptimized={item.src.endsWith('.svg')}
          />
        ) : (
          <video
            className={styles.video}
            width={item.width}
            height={item.height}
            poster={item.poster}
            preload="none"
            controls
            playsInline
            muted={videoAccessibility.audio === 'none'}
            aria-label={item.alt}
            aria-describedby={hasCaption ? captionId : undefined}
          >
            <source src={item.src} type="video/mp4" />
            {videoAccessibility.track ? (
              <track
                kind={videoAccessibility.track.kind}
                src={videoAccessibility.track.src}
                srcLang={videoAccessibility.track.srcLang}
                label={videoAccessibility.track.label}
                default
              />
            ) : null}
            <a href={item.src}>Open the recorded project demo</a>
          </video>
        )}
      </div>
      {hasCaption ? (
        <figcaption id={captionId} className={styles.caption}>
          {item.caption ? `${item.caption} ` : null}
          {silent ? 'Silent recording; no audio track is present.' : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

export default function ProjectMediaGallery({
  media,
  coverImage = '',
}: ProjectMediaGalleryProps) {
  const galleryItems = media.filter(
    (item) => item.type === 'video' || item.src !== coverImage,
  );

  if (galleryItems.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="project-gallery-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Product evidence</p>
        <h2 id="project-gallery-title" className={styles.title}>
          Workflow in practice
        </h2>
      </header>

      <div className={styles.grid}>
        {galleryItems.map((item, index) => (
          <GalleryItem
            key={`${item.type}-${item.src}`}
            item={item}
            index={index}
            totalCount={galleryItems.length}
          />
        ))}
      </div>
    </section>
  );
}
