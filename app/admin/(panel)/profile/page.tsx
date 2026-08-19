import ProfileForm from '@/components/admin/ProfileForm';
import { getAdminProfile } from '@/lib/admin/data';
import { defaultProfile } from '@/lib/db/defaults';
import type { Profile } from '@/lib/db/schema';
import styles from '@/styles/Admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminProfilePage() {
  const existing = await getAdminProfile();
  const profile: Profile =
    existing ?? { id: 0, updatedAt: new Date(), ...defaultProfile };

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
        <p className={styles.subtitle}>
          Your identity, bio, skills and experience. Powers the home, about and contact pages.
        </p>
      </header>
      <div className={styles.card}>
        <ProfileForm profile={profile} />
      </div>
    </>
  );
}
