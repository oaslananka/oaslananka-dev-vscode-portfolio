import Link from 'next/link';

import { getAdminPosts, getAdminProfile, getAdminProjects } from '@/lib/admin/data';
import styles from '@/styles/Admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [profile, projects, posts] = await Promise.all([
    getAdminProfile(),
    getAdminProjects(),
    getAdminPosts(),
  ]);

  const publishedPosts = posts.filter((p) => p.published).length;

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>
          Welcome back{profile ? `, ${profile.name}` : ''}. Manage your portfolio content here.
        </p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{projects.length}</div>
          <div className={styles.statLabel}>Projects</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{posts.length}</div>
          <div className={styles.statLabel}>Blog posts</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{publishedPosts}</div>
          <div className={styles.statLabel}>Published</div>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.label} style={{ fontSize: 15, marginBottom: 12 }}>Quick actions</h2>
        <div className={styles.linkRow}>
          <Link href="/admin/profile" className={styles.button}>Edit profile</Link>
          <Link href="/admin/projects/new" className={styles.button}>New project</Link>
          <Link href="/admin/posts/new" className={styles.button}>New blog post</Link>
          <Link href="/admin/settings" className={styles.button}>Site settings</Link>
        </div>
      </div>
    </>
  );
}
