import Image from 'next/image';

import MarkdownContent from '@/components/MarkdownContent';
import { groupApprovalFields } from '@/lib/admin/approval-review';
import { isAllowedImageSource } from '@/lib/image-policy';
import { isSafeHttpsUrl } from '@/lib/url-policy';
import styles from '@/styles/ApprovalReview.module.css';

const headings: Record<string, string> = {
  title: 'Title', slug: 'URL slug', description: 'Short description', excerpt: 'Excerpt',
  role: 'Role', repo: 'Source repository', link: 'Project website',
  coverImage: 'Cover image', coverImageAlt: 'Cover description', logo: 'Logo',
  longDescription: 'Project description', body: 'Article content',
  tags: 'Tags', outcomes: 'Engineering outcomes', media: 'Media gallery',
  links: 'Resources', sortOrder: 'Display order', featured: 'Featured',
  published: 'Publication status',
};

function readable(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'Not set';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function ImagePreview({ source, alt }: { source: string; alt: string }) {
  if (!isAllowedImageSource(source) || !source) {
    return <p className={styles.muted}>Image cannot be previewed. Review the URL in the exact payload below.</p>;
  }
  return (
    <figure className={styles.figure}>
      <Image src={source} width={900} height={510} alt={alt || 'Proposed media preview'}
        unoptimized className={styles.mediaImage} />
      <figcaption>{alt || 'No image description supplied'}</figcaption>
    </figure>
  );
}

function StructuredList({ field, value }: { field: string; value: unknown[] }) {
  if (field === 'tags' && value.every(item => typeof item === 'string')) {
    return <div className={styles.tags}>{value.map((tag, index) =>
      <span className={styles.tag} key={index}>{String(tag)}</span>)}</div>;
  }
  if (field === 'outcomes' && value.every(item => typeof item === 'string')) {
    return <ul className={styles.outcomes}>{value.map((item, index) => <li key={index}>{String(item)}</li>)}</ul>;
  }
  if (field === 'links' && value.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
    return <ul className={styles.outcomes}>{value.map((item, index) => {
      const link = item as Record<string, unknown>;
      const url = typeof link.url === 'string' ? link.url : '';
      const title = typeof link.label === 'string' ? link.label : 'Resource';
      return <li key={index}>{isSafeHttpsUrl(url) ? <a href={url} target="_blank" rel="noopener noreferrer">{title}</a> : title}</li>;
    })}</ul>;
  }
  if (field === 'media' && value.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
    return <div className={styles.gallery}>{value.map((item, index) => {
      const media = item as Record<string, unknown>;
      const src = typeof media.src === 'string' ? media.src : '';
      const alt = typeof media.alt === 'string' ? media.alt : '';
      return <div className={styles.galleryItem} key={index}>
        {media.type === 'image' && src ? <ImagePreview source={src} alt={alt} /> :
          <p className={styles.muted}>{media.type === 'video' ? 'Video attachment' : 'Media attachment'}: {src}</p>}
        {typeof media.caption === 'string' && <p className={styles.caption}>{media.caption}</p>}
      </div>;
    })}</div>;
  }
  return <pre className={styles.raw}>{readable(value)}</pre>;
}

function Preview({ field, value, imageAlt }: { field: string; value: unknown; imageAlt?: string }) {
  if (value === undefined || value === null || value === '') return <span className={styles.muted}>Not set</span>;
  if ((field === 'longDescription' || field === 'body') && typeof value === 'string') {
    return <div tabIndex={0} aria-label={field + ' Markdown preview'} className={styles.markdownPreview}>
      <MarkdownContent>{value}</MarkdownContent>
    </div>;
  }
  if (['coverImage', 'logo', 'avatarUrl'].includes(field) && typeof value === 'string') {
    return <ImagePreview source={value} alt={imageAlt || 'Proposed image preview'} />;
  }
  if (Array.isArray(value)) return <StructuredList field={field} value={value} />;
  if (typeof value === 'string' && ['repo', 'link'].includes(field) && isSafeHttpsUrl(value)) {
    return <a className={styles.link} href={value} target="_blank" rel="noopener noreferrer">{value}</a>;
  }
  if (typeof value === 'boolean') return <strong>{value ? 'Yes' : 'No'}</strong>;
  if (typeof value === 'number' || typeof value === 'string') return <span className={styles.value}>{String(value)}</span>;
  return <pre className={styles.raw}>{readable(value)}</pre>;
}

export default function ApprovalFieldReview({
  patch, current,
}: {
  patch: Record<string, unknown>;
  current: Record<string, unknown>;
}) {
  const groups = groupApprovalFields(patch, current);
  const alt = typeof patch.coverImageAlt === 'string' ? patch.coverImageAlt : '';
  return (
    <>
      <p className={styles.reviewNote}>Only fields included in this proposal are shown. The original request is available below for exact comparison.</p>
      {groups.map(group => (
        <section key={group.heading} className={styles.group} aria-label={group.heading}>
          <div className={styles.groupHeading}>
            <h3>{group.heading}</h3>
            <span>{group.description}</span>
          </div>
          <div className={styles.fieldGrid}>
            {group.fields.map(({ field, current: old, proposed }) => (
              <div key={field} className={styles.field + (field === 'longDescription' || field === 'body' || field === 'media' ? ' ' + styles.wideField : '')}>
                <div className={styles.fieldHeading}>
                  <h4>{headings[field] || field}</h4>
                  <span className={styles.fieldKey}>{field}</span>
                </div>
                {old !== undefined && <details className={styles.currentDetails}>
                  <summary>Current value</summary>
                  <div className={styles.currentPanel}><Preview field={field} value={old} imageAlt={alt} /></div>
                </details>}
                <div className={styles.proposed}>
                  <span className={styles.proposedLabel}>Proposed</span>
                  <Preview field={field} value={proposed} imageAlt={alt} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      <details className={styles.rawDetails}>
        <summary>Inspect exact request payload (JSON)</summary>
        <pre className={styles.raw} tabIndex={0}>{JSON.stringify(patch, null, 2)}</pre>
      </details>
    </>
  );
}
