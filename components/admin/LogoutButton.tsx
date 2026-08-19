import { logout } from '@/lib/admin/actions/auth';
import styles from '@/styles/Admin.module.css';

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className={styles.button} style={{ width: '100%' }}>
        Sign out
      </button>
    </form>
  );
}
