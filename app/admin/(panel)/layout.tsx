import AdminNav from '@/components/admin/AdminNav';
import LogoutButton from '@/components/admin/LogoutButton';
import { dbReady, getUnreadMessageCount } from '@/lib/admin/data';
import styles from '@/styles/Admin.module.css';

export const dynamic = 'force-dynamic';

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const unreadCount = await getUnreadMessageCount();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          <span>Portfolio CMS</span>
        </div>
        <AdminNav unreadCount={unreadCount} />
        <div className={styles.spacer} />
        <LogoutButton />
      </aside>
      <main className={styles.main}>
        {!dbReady() && (
          <div className={styles.notice}>
            No database is connected (<code>DATABASE_URL</code> is missing). The
            public site is running on placeholder content and edits cannot be
            saved yet. Add a Neon database and run migrations to enable editing.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
