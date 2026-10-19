'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { VscClose, VscSearch } from '@/components/UiIcons';
import type { ProjectMedia } from '@/lib/project-content';
import styles from '@/styles/ProjectMediaGallery.module.css';

type ImageItem = Extract<ProjectMedia, { type: 'image' }>;

export default function ProjectGalleryImage({
  item,
  featured,
}: {
  readonly item: ImageItem;
  readonly featured: boolean;
}) {
  const lightbox = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        className={styles.expandImage}
        type="button"
        aria-label={`Expand image: ${item.alt}`}
        onClick={() => lightbox.current?.showModal()}
      >
        <Image
          src={item.src}
          alt={item.alt}
          width={item.width}
          height={item.height}
          sizes={featured
            ? '(max-width: 760px) 100vw, 1100px'
            : '(max-width: 760px) 100vw, 550px'}
          className={styles.image}
          unoptimized={item.src.endsWith('.svg')}
        />
        <span className={styles.zoomHint}>
          <VscSearch aria-hidden="true" size={14} />
          Expand
        </span>
      </button>
      <dialog ref={lightbox} className={styles.lightbox} aria-label={`Expanded image: ${item.alt}`}>
        <div className={styles.lightboxActions}>
          <span>Scroll to inspect image details</span>
          <button type="button" onClick={() => lightbox.current?.close()} aria-label="Close expanded image">
            <VscClose aria-hidden="true" size={18} />
            Close
          </button>
        </div>
        <Image
          src={item.src}
          alt={item.alt}
          width={item.width}
          height={item.height}
          className={styles.expandedImage}
          unoptimized={item.src.endsWith('.svg')}
        />
        {item.caption ? <p className={styles.lightboxCaption}>{item.caption}</p> : null}
      </dialog>
    </>
  );
}
