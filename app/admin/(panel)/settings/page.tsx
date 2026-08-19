import SettingsForm from '@/components/admin/SettingsForm';
import { getAdminSettings } from '@/lib/admin/data';
import { defaultSettings } from '@/lib/db/defaults';
import type { SiteSettings } from '@/lib/db/schema';
import styles from '@/styles/Admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const existing = await getAdminSettings();
  const settings: SiteSettings =
    existing ?? { id: 0, updatedAt: new Date(), ...defaultSettings };

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Site settings</h1>
        <p className={styles.subtitle}>
          SEO defaults, keywords and the default theme for new visitors.
        </p>
      </header>
      <div className={styles.card}>
        <SettingsForm settings={settings} />
      </div>
    </>
  );
}
