import PostForm from '@/components/admin/PostForm';
import styles from '@/styles/Admin.module.css';

export default function NewPostPage() {
  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>New blog post</h1>
        <p className={styles.subtitle}>Write a post in Markdown.</p>
      </header>
      <div className={styles.card}>
        <PostForm />
      </div>
    </>
  );
}
