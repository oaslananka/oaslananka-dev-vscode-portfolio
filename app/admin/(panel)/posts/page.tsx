import Link from 'next/link';

import DeleteButton from '@/components/admin/DeleteButton';
import { deletePost } from '@/lib/admin/actions/posts';
import { getAdminPosts } from '@/lib/admin/data';
import styles from '@/styles/Admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminPostsPage() {
  const posts = await getAdminPosts();

  return (
    <>
      <header className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className={styles.title}>Blog posts</h1>
          <p className={styles.subtitle}>{posts.length} post{posts.length === 1 ? '' : 's'}</p>
        </div>
        <Link href="/admin/posts/new" className={`${styles.button} ${styles.buttonPrimary}`}>
          New post
        </Link>
      </header>

      <div className={styles.card}>
        {posts.length === 0 ? (
          <p className={styles.subtitle}>No posts yet. Write your first one.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Published</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <span className={styles.tableTitle}>{post.title}</span>
                    <span className={`${styles.tableSlug} ${styles.mono}`}>
                      /{post.slug}
                    </span>
                  </td>
                  <td>
                    {post.published ? (
                      <span className={`${styles.badge} ${styles.badgeOn}`}>Published</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeOff}`}>Draft</span>
                    )}
                  </td>
                  <td className={styles.mono}>
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <Link href={`/admin/posts/${post.id}`} className={styles.button}>Edit</Link>
                      <DeleteButton action={deletePost} id={post.id} confirmText={`Delete "${post.title}"?`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
