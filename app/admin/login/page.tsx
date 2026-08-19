import { redirect } from 'next/navigation';

import LoginForm from '@/components/admin/LoginForm';
import { isAuthenticated } from '@/lib/auth';
import styles from '@/styles/Admin.module.css';

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect('/admin');
  }

  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <div className={styles.brand} style={{ padding: 0, marginBottom: 20 }}>
          <span className={styles.brandDot} />
          <span>Admin Panel</span>
        </div>
        <h1 className={styles.loginTitle}>Sign in</h1>
        <p className={styles.loginSubtitle}>Enter your admin password to continue.</p>
        <LoginForm />
      </div>
    </div>
  );
}
