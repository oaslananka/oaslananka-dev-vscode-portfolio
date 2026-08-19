'use client';

import { useActionState } from 'react';

import { updateProfile } from '@/lib/admin/actions/profile'
import type { ActionState } from '@/lib/admin/action-state';
import FormMessage from '@/components/admin/FormMessage';
import SubmitButton from '@/components/admin/SubmitButton';
import type { Profile } from '@/lib/db/schema';
import styles from '@/styles/Admin.module.css';

const initialState: ActionState = { ok: false };

const json = (value: unknown) => JSON.stringify(value, null, 2);

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <FormMessage state={state} />

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="profile-name" className={styles.label}>Name</label>
          <input id="profile-name" name="name" className={styles.input} defaultValue={profile.name} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="profile-role" className={styles.label}>Role</label>
          <input id="profile-role" name="role" className={styles.input} defaultValue={profile.role} required />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="profile-tagline" className={styles.label}>
          Tagline <span className={styles.hint}>(one line, used in JSON-LD)</span>
        </label>
        <input id="profile-tagline" name="tagline" className={styles.input} defaultValue={profile.tagline} />
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="profile-greeting" className={styles.label}>Greeting</label>
          <input id="profile-greeting" name="greeting" className={styles.input} defaultValue={profile.greeting} />
        </div>
        <div className={styles.field}>
          <label htmlFor="profile-location" className={styles.label}>Location</label>
          <input id="profile-location" name="location" className={styles.input} defaultValue={profile.location} />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="profile-hero-description" className={styles.label}>
          Hero description <span className={styles.hint}>(shown on the home page)</span>
        </label>
        <textarea id="profile-hero-description" name="heroDescription" className={styles.textarea} defaultValue={profile.heroDescription} />
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="profile-email" className={styles.label}>Email</label>
          <input id="profile-email" name="email" type="email" className={styles.input} defaultValue={profile.email} />
        </div>
        <div className={styles.field}>
          <label htmlFor="profile-avatar-url" className={styles.label}>Avatar URL</label>
          <input id="profile-avatar-url" name="avatarUrl" className={styles.input} defaultValue={profile.avatarUrl} />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="profile-resume-url" className={styles.label}>Resume URL</label>
        <input id="profile-resume-url" name="resumeUrl" className={styles.input} defaultValue={profile.resumeUrl} />
      </div>

      <div className={styles.checkboxRow}>
        <input id="availableForWork" name="availableForWork" type="checkbox" className={styles.checkbox} defaultChecked={profile.availableForWork} />
        <label htmlFor="availableForWork" className={styles.label}>Available for work</label>
      </div>

      <div className={styles.field}>
        <label htmlFor="profile-bio" className={styles.label}>
          Bio <span className={styles.hint}>(separate paragraphs with a blank line)</span>
        </label>
        <textarea id="profile-bio" name="bio" className={styles.textarea} rows={6} defaultValue={profile.bio.join('\n\n')} />
      </div>

      <div className={styles.field}>
        <label htmlFor="profile-socials" className={styles.label}>
          Socials <span className={styles.hint}>{'JSON: [{ "platform": "github", "label": "handle", "url": "https://…" }]'}</span>
        </label>
        <textarea id="profile-socials" name="socials" className={`${styles.textarea} ${styles.mono}`} rows={8} defaultValue={json(profile.socials)} />
      </div>

      <div className={styles.field}>
        <label htmlFor="profile-skills" className={styles.label}>
          Skills <span className={styles.hint}>{'JSON: [{ "category": "Languages", "items": ["TypeScript"] }]'}</span>
        </label>
        <textarea id="profile-skills" name="skills" className={`${styles.textarea} ${styles.mono}`} rows={8} defaultValue={json(profile.skills)} />
      </div>

      <div className={styles.field}>
        <label htmlFor="profile-experience" className={styles.label}>
          Experience <span className={styles.hint}>{'JSON: [{ "role": "", "company": "", "period": "", "points": [""] }]'}</span>
        </label>
        <textarea id="profile-experience" name="experience" className={`${styles.textarea} ${styles.mono}`} rows={10} defaultValue={json(profile.experience)} />
      </div>

      <div className={styles.field}>
        <label htmlFor="profile-education" className={styles.label}>
          Education{' '}
          <span className={styles.hint}>
            {'JSON: [{ "institution": "", "qualification": "", "details": "" }]'}
          </span>
        </label>
        <textarea
          id="profile-education"
          name="education"
          className={`${styles.textarea} ${styles.mono}`}
          rows={8}
          defaultValue={json(profile.education)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="profile-writing" className={styles.label}>
          Writing / Publications <span className={styles.hint}>{'JSON: [{ "label": "", "url": "" }]'}</span>
        </label>
        <textarea id="profile-writing" name="writing" className={`${styles.textarea} ${styles.mono}`} rows={5} defaultValue={json(profile.writing)} />
      </div>

      <div className={styles.actions}>
        <SubmitButton>Save profile</SubmitButton>
      </div>
    </form>
  );
}
