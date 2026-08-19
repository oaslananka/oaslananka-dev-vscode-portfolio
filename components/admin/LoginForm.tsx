'use client';

import { useActionState } from 'react';

import { login } from '@/lib/admin/actions/auth'
import type { ActionState } from '@/lib/admin/action-state';
import FormMessage from '@/components/admin/FormMessage';
import SubmitButton from '@/components/admin/SubmitButton';
import styles from '@/styles/Admin.module.css';

const initialState: ActionState = { ok: false };

export default function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className={styles.input}
          autoComplete="current-password"
          autoFocus
          required
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton>Sign in</SubmitButton>
    </form>
  );
}
