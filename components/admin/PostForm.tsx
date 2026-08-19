'use client';

import { useActionState, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { savePost } from '@/lib/admin/actions/posts'
import type { ActionState } from '@/lib/admin/action-state';
import FormMessage from '@/components/admin/FormMessage';
import SubmitButton from '@/components/admin/SubmitButton';
import type { Post } from '@/lib/db/schema';
import styles from '@/styles/Admin.module.css';

const initialState: ActionState = { ok: false };

function toLocalInput(date: Date | string): string {
  const value = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
    value.getHours(),
  )}:${pad(value.getMinutes())}`;
}

export default function PostForm({ post }: { post?: Post }) {
  const [state, formAction] = useActionState(savePost, initialState);
  const [body, setBody] = useState(post?.body ?? '');
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  return (
    <form action={formAction} className={styles.form}>
      <FormMessage state={state} />
      {post ? <input type="hidden" name="id" value={post.id} /> : null}

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="post-title" className={styles.label}>Title</label>
          <input id="post-title" name="title" className={styles.input} defaultValue={post?.title ?? ''} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="post-slug" className={styles.label}>
            Slug <span className={styles.hint}>(auto from title if blank)</span>
          </label>
          <input id="post-slug" name="slug" className={styles.input} defaultValue={post?.slug ?? ''} />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="post-excerpt" className={styles.label}>
          Excerpt <span className={styles.hint}>(meta description &amp; card summary)</span>
        </label>
        <textarea id="post-excerpt" name="excerpt" className={styles.textarea} rows={2} defaultValue={post?.excerpt ?? ''} />
      </div>

      <div className={styles.field}>
        <div className={styles.previewToggle} role="tablist" aria-label="Post editor mode">
          <button
            type="button"
            id="post-write-tab"
            role="tab"
            aria-selected={tab === 'write'}
            aria-controls="post-write-panel"
            className={`${styles.tab} ${tab === 'write' ? styles.tabActive : ''}`}
            onClick={() => setTab('write')}
          >
            Write
          </button>
          <button
            type="button"
            id="post-preview-tab"
            role="tab"
            aria-selected={tab === 'preview'}
            aria-controls="post-preview-panel"
            className={`${styles.tab} ${tab === 'preview' ? styles.tabActive : ''}`}
            onClick={() => setTab('preview')}
          >
            Preview
          </button>
        </div>
        {tab === 'write' ? (
          <div id="post-write-panel" role="tabpanel" aria-labelledby="post-write-tab">
            <label htmlFor="post-body" className={styles.label}>Post body</label>
            <textarea
              id="post-body"
              name="body"
              className={`${styles.textarea} ${styles.mono}`}
              rows={18}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write your post in Markdown…"
            />
          </div>
        ) : (
          <div id="post-preview-panel" role="tabpanel" aria-labelledby="post-preview-tab">
            <input type="hidden" name="body" value={body} />
            <div className={styles.preview}>
              <Markdown remarkPlugins={[remarkGfm]}>{body || '_Nothing to preview yet._'}</Markdown>
            </div>
          </div>
        )}
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="post-cover-image" className={styles.label}>Cover image URL</label>
          <input id="post-cover-image" name="coverImage" className={styles.input} defaultValue={post?.coverImage ?? ''} />
        </div>
        <div className={styles.field}>
          <label htmlFor="post-tags" className={styles.label}>
            Tags <span className={styles.hint}>(comma separated)</span>
          </label>
          <input id="post-tags" name="tags" className={styles.input} defaultValue={post?.tags.join(', ') ?? ''} />
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="post-published-at" className={styles.label}>Published date</label>
          <input
            id="post-published-at"
            name="publishedAt"
            type="datetime-local"
            className={styles.input}
            defaultValue={toLocalInput(post?.publishedAt ?? new Date())}
          />
        </div>
        <div className={styles.checkboxRow} style={{ alignSelf: 'end', paddingBottom: 10 }}>
          <input id="published" name="published" type="checkbox" className={styles.checkbox} defaultChecked={post?.published ?? false} />
          <label htmlFor="published" className={styles.label}>Published</label>
        </div>
      </div>

      <div className={styles.actions}>
        <SubmitButton>{post ? 'Save changes' : 'Create post'}</SubmitButton>
      </div>
    </form>
  );
}
