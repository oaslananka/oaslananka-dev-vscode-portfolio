'use client';

import styles from '@/styles/Admin.module.css';

export default function DeleteButton({
  action,
  id,
  label = 'Delete',
  confirmText = 'Delete this item? This cannot be undone.',
}: {
  action: (formData: FormData) => Promise<void>;
  id: number;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={`${styles.button} ${styles.buttonDanger}`}>
        {label}
      </button>
    </form>
  );
}
