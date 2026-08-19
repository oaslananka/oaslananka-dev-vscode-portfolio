import { notFound } from 'next/navigation';

import ProjectForm from '@/components/admin/ProjectForm';
import { getAdminProject } from '@/lib/admin/data';
import styles from '@/styles/Admin.module.css';

export const dynamic = 'force-dynamic';

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getAdminProject(Number(id));
  if (!project) notFound();

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Edit project</h1>
        <p className={styles.subtitle}>{project.title}</p>
      </header>
      <div className={styles.card}>
        <ProjectForm project={project} />
      </div>
    </>
  );
}
