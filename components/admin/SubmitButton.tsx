'use client';

import { useFormStatus } from 'react-dom';

import styles from '@/styles/Admin.module.css';

export default function SubmitButton({
  children = 'Save',
}: {
  children?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`${styles.button} ${styles.buttonPrimary}`}
      disabled={pending}
    >
      {pending ? 'Saving…' : children}
    </button>
  );
}
