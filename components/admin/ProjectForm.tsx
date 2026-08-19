'use client';

import { useActionState } from 'react';

import { saveProject } from '@/lib/admin/actions/projects'
import type { ActionState } from '@/lib/admin/action-state';
import FormMessage from '@/components/admin/FormMessage';
import SubmitButton from '@/components/admin/SubmitButton';
import type { Project } from '@/lib/db/schema';
import styles from '@/styles/Admin.module.css';

const initialState: ActionState = { ok: false };

export default function ProjectForm({ project }: { project?: Project }) {
  const [state, formAction] = useActionState(saveProject, initialState);
  const json = (value: unknown) => JSON.stringify(value ?? [], null, 2);

  return (
    <form action={formAction} className={styles.form}>
      <FormMessage state={state} />
      {project ? <input type="hidden" name="id" value={project.id} /> : null}

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="project-title" className={styles.label}>Title</label>
          <input id="project-title" name="title" className={styles.input} defaultValue={project?.title ?? ''} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="project-slug" className={styles.label}>
            Slug <span className={styles.hint}>(auto from title if blank)</span>
          </label>
          <input id="project-slug" name="slug" className={styles.input} defaultValue={project?.slug ?? ''} />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="project-description" className={styles.label}>Short description</label>
        <textarea id="project-description" name="description" className={styles.textarea} defaultValue={project?.description ?? ''} required />
      </div>

      <div className={styles.field}>
        <label htmlFor="project-role" className={styles.label}>Role and scope</label>
        <input
          id="project-role"
          name="role"
          className={styles.input}
          defaultValue={project?.role ?? ''}
          placeholder="Lead engineer · architecture, integration and release"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="project-long-description" className={styles.label}>
          Long description <span className={styles.hint}>(optional)</span>
        </label>
        <textarea id="project-long-description" name="longDescription" className={styles.textarea} defaultValue={project?.longDescription ?? ''} />
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="project-logo" className={styles.label}>Logo / image URL</label>
          <input id="project-logo" name="logo" className={styles.input} defaultValue={project?.logo ?? ''} />
        </div>
        <div className={styles.field}>
          <label htmlFor="project-tags" className={styles.label}>
            Tags <span className={styles.hint}>(comma separated)</span>
          </label>
          <input id="project-tags" name="tags" className={styles.input} defaultValue={project?.tags.join(', ') ?? ''} />
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="project-cover-image" className={styles.label}>Cover image</label>
          <input
            id="project-cover-image"
            name="coverImage"
            className={styles.input}
            defaultValue={project?.coverImage ?? ''}
            placeholder="/projects/example/cover.webp"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="project-cover-alt" className={styles.label}>Cover image alt text</label>
          <input
            id="project-cover-alt"
            name="coverImageAlt"
            className={styles.input}
            defaultValue={project?.coverImageAlt ?? ''}
          />
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="project-link" className={styles.label}>Live URL</label>
          <input id="project-link" name="link" className={styles.input} defaultValue={project?.link ?? ''} />
        </div>
        <div className={styles.field}>
          <label htmlFor="project-repo" className={styles.label}>Repository URL</label>
          <input id="project-repo" name="repo" className={styles.input} defaultValue={project?.repo ?? ''} />
        </div>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Structured case-study content</legend>
        <div className={styles.field}>
          <label htmlFor="project-outcomes" className={styles.label}>
            Outcomes <span className={styles.hint}>(JSON string array, up to 8)</span>
          </label>
          <textarea
            id="project-outcomes"
            name="outcomes"
            className={`${styles.textarea} ${styles.mono}`}
            defaultValue={json(project?.outcomes)}
            spellCheck={false}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="project-media" className={styles.label}>
            Media <span className={styles.hint}>(JSON image/video objects, up to 12)</span>
          </label>
          <textarea
            id="project-media"
            name="media"
            className={`${styles.textarea} ${styles.mono} ${styles.codeTextarea}`}
            defaultValue={json(project?.media)}
            spellCheck={false}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="project-links" className={styles.label}>
            Additional links <span className={styles.hint}>(JSON objects, HTTPS only)</span>
          </label>
          <textarea
            id="project-links"
            name="links"
            className={`${styles.textarea} ${styles.mono} ${styles.codeTextarea}`}
            defaultValue={json(project?.links)}
            spellCheck={false}
          />
        </div>
      </fieldset>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="project-sort-order" className={styles.label}>Sort order</label>
          <input id="project-sort-order" name="sortOrder" type="number" className={styles.input} defaultValue={project?.sortOrder ?? 0} />
        </div>
        <div className={styles.checkboxRow} style={{ alignSelf: 'end', paddingBottom: 10 }}>
          <input id="featured" name="featured" type="checkbox" className={styles.checkbox} defaultChecked={project?.featured ?? false} />
          <label htmlFor="featured" className={styles.label}>Featured</label>
        </div>
      </div>

      <div className={styles.actions}>
        <SubmitButton>{project ? 'Save changes' : 'Create project'}</SubmitButton>
      </div>
    </form>
  );
}
