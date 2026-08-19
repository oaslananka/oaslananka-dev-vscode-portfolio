import ProjectForm from '@/components/admin/ProjectForm';
import styles from '@/styles/Admin.module.css';

export default function NewProjectPage() {
  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>New project</h1>
        <p className={styles.subtitle}>Add a project to your portfolio.</p>
      </header>
      <div className={styles.card}>
        <ProjectForm />
      </div>
    </>
  );
}
