import Link from 'next/link';

import DeleteButton from '@/components/admin/DeleteButton';
import { deleteProject } from '@/lib/admin/actions/projects';
import { getAdminProjects } from '@/lib/admin/data';
import styles from '@/styles/Admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminProjectsPage() {
  const projects = await getAdminProjects();

  return (
    <>
      <header className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className={styles.title}>Projects</h1>
          <p className={styles.subtitle}>{projects.length} project{projects.length === 1 ? '' : 's'}</p>
        </div>
        <Link href="/admin/projects/new" className={`${styles.button} ${styles.buttonPrimary}`}>
          New project
        </Link>
      </header>

      <div className={styles.card}>
        {projects.length === 0 ? (
          <p className={styles.subtitle}>No projects yet. Create your first one.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Featured</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.title}</td>
                  <td className={styles.mono}>{project.slug}</td>
                  <td>
                    {project.featured ? (
                      <span className={`${styles.badge} ${styles.badgeOn}`}>Featured</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeOff}`}>—</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <Link href={`/admin/projects/${project.id}`} className={styles.button}>Edit</Link>
                      <DeleteButton action={deleteProject} id={project.id} confirmText={`Delete "${project.title}"?`} />
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
