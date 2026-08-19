'use client';

import { useActionState } from 'react';

import { updateSettings } from '@/lib/admin/actions/settings'
import type { ActionState } from '@/lib/admin/action-state';
import FormMessage from '@/components/admin/FormMessage';
import SubmitButton from '@/components/admin/SubmitButton';
import { THEMES } from '@/lib/themes';
import type { SiteSettings } from '@/lib/db/schema';
import styles from '@/styles/Admin.module.css';

const initialState: ActionState = { ok: false };

export default function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction] = useActionState(updateSettings, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <FormMessage state={state} />

      <div className={styles.field}>
        <label htmlFor="settings-site-title" className={styles.label}>
          Site title <span className={styles.hint}>(default browser tab / OG title)</span>
        </label>
        <input id="settings-site-title" name="siteTitle" className={styles.input} defaultValue={settings.siteTitle} required />
      </div>

      <div className={styles.field}>
        <label htmlFor="settings-site-description" className={styles.label}>
          Site description <span className={styles.hint}>(meta description)</span>
        </label>
        <textarea id="settings-site-description" name="siteDescription" className={styles.textarea} defaultValue={settings.siteDescription} />
      </div>

      <div className={styles.field}>
        <label htmlFor="settings-keywords" className={styles.label}>
          Keywords <span className={styles.hint}>(comma separated)</span>
        </label>
        <input id="settings-keywords" name="keywords" className={styles.input} defaultValue={settings.keywords.join(', ')} />
      </div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor="settings-default-theme" className={styles.label}>Default theme</label>
          <select id="settings-default-theme" name="defaultTheme" className={styles.select} defaultValue={settings.defaultTheme}>
            {THEMES.map((theme) => (
              <option key={theme.theme} value={theme.theme}>{theme.name}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="settings-og-heading" className={styles.label}>
            OG heading override <span className={styles.hint}>(optional)</span>
          </label>
          <input id="settings-og-heading" name="ogHeading" className={styles.input} defaultValue={settings.ogHeading} />
        </div>
      </div>

      <div className={styles.actions}>
        <SubmitButton>Save settings</SubmitButton>
      </div>
    </form>
  );
}
