'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { VscCheck, VscSend } from '@/components/UiIcons';

import { submitContact, type ContactState } from '@/lib/contact-actions';
import styles from '@/styles/ContactForm.module.css';

const initialState: ContactState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.button} disabled={pending}>
      <VscSend size={15} />
      {pending ? 'Sending…' : 'Send message'}
    </button>
  );
}

export default function ContactForm() {
  const [state, formAction] = useActionState(submitContact, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const errorId = state.message && !state.ok ? 'contact-form-error' : undefined;

  useEffect(() => {
    if (!state.field) return;

    const field = formRef.current?.elements.namedItem(state.field);
    if (field instanceof HTMLElement) field.focus();
  }, [state.field, state.validationRevision]);

  if (state.ok) {
    return (
      <div className={styles.success} role="status" aria-live="polite">
        <VscCheck size={18} />
        <span>{state.message}</span>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className={styles.form}>
      {/* Honeypot — hidden from real users */}
      <input
        type="text"
        name="website"
        className={styles.honeypot}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            className={styles.input}
            autoComplete="name"
            maxLength={120}
            aria-invalid={state.field === 'name' || undefined}
            aria-describedby={state.field === 'name' ? errorId : undefined}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={styles.input}
            autoComplete="email"
            maxLength={254}
            aria-invalid={state.field === 'email' || undefined}
            aria-describedby={state.field === 'email' ? errorId : undefined}
            required
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="inquiryType">
            What can I help with?
          </label>
          <select
            id="inquiryType"
            name="inquiryType"
            className={styles.input}
            defaultValue="project"
            aria-invalid={state.field === 'inquiryType' || undefined}
            aria-describedby={
              state.field === 'inquiryType' ? errorId : undefined
            }
            required
          >
            <option value="project">Project inquiry</option>
            <option value="role">Role opportunity</option>
            <option value="collaboration">Collaboration</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="organization">
            Organization <span aria-hidden="true">(optional)</span>
          </label>
          <input
            id="organization"
            name="organization"
            className={styles.input}
            autoComplete="organization"
            maxLength={160}
            aria-invalid={state.field === 'organization' || undefined}
            aria-describedby={
              state.field === 'organization' ? errorId : undefined
            }
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          className={styles.textarea}
          rows={5}
          minLength={10}
          maxLength={5000}
          aria-invalid={state.field === 'message' || undefined}
          aria-describedby={state.field === 'message' ? errorId : undefined}
          required
        />
      </div>

      {state.message && !state.ok && (
        <div
          id={errorId}
          className={styles.error}
          role="alert"
          aria-live="assertive"
        >
          {state.message}
        </div>
      )}

      <p className={styles.label}>
        By submitting, you agree to the{' '}
        <a href="/privacy">privacy notice</a>. Messages are retained for no
        longer than 12 months.
      </p>

      <SubmitButton />
    </form>
  );
}
