import styles from '@/styles/Admin.module.css';

import type { ActionState } from '@/lib/admin/action-state';

export default function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <div
      className={`${styles.message} ${
        state.ok ? styles.messageOk : styles.messageError
      }`}
    >
      {state.message}
    </div>
  );
}
