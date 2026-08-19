import { notFound } from 'next/navigation';

import PostForm from '@/components/admin/PostForm';
import { getAdminPost } from '@/lib/admin/data';
import styles from '@/styles/Admin.module.css';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getAdminPost(Number(id));
  if (!post) notFound();

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Edit post</h1>
        <p className={styles.subtitle}>{post.title}</p>
      </header>
      <div className={styles.card}>
        <PostForm post={post} />
      </div>
    </>
  );
}
