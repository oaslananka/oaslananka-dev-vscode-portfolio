import { deleteMessage, markMessageRead } from '@/lib/admin/actions/messages';
import { getContactMessages } from '@/lib/admin/data';
import { CONTACT_NOTIFICATION_MAX_ATTEMPTS } from '@/lib/contact-notification-policy';
import { retryContactNotification } from '@/lib/contact-actions';
import styles from '@/styles/Admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
  const messages = await getContactMessages();
  const unread = messages.filter((message) => !message.read).length;

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Messages</h1>
        <p className={styles.subtitle}>
          {messages.length} total{unread ? ` · ${unread} unread` : ''}
        </p>
      </header>

      {messages.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.subtitle}>No messages yet.</p>
        </div>
      ) : (
        messages.map((message) => {
          const terminalFailure =
            message.notificationStatus === 'failed' &&
            message.notificationAttempts >= CONTACT_NOTIFICATION_MAX_ATTEMPTS;
          const retryable =
            message.notificationStatus === 'pending' ||
            (message.notificationStatus === 'failed' && !terminalFailure);
          const hasLease = message.notificationClaimExpiresAt !== null;

          return (
            <div
              key={message.id}
              className={styles.card}
              style={message.read ? { opacity: 0.7 } : undefined}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 10,
                }}
              >
                <div>
                  <strong>{message.name}</strong>{' '}
                  <a
                    href={`mailto:${message.email}`}
                    style={{ color: 'var(--accent-color)' }}
                  >
                    {message.email}
                  </a>
                  {!message.read && (
                    <span
                      className={`${styles.badge} ${styles.badgeOn}`}
                      style={{ marginLeft: 8 }}
                    >
                      New
                    </span>
                  )}
                  <span className={styles.badge} style={{ marginLeft: 8 }}>
                    {message.inquiryType}
                  </span>
                  {terminalFailure && (
                    <span
                      className={`${styles.badge} ${styles.badgeOff}`}
                      style={{ marginLeft: 8 }}
                    >
                      Terminal failure
                    </span>
                  )}
                </div>
                <span className={styles.subtitle} style={{ margin: 0 }}>
                  {new Date(message.createdAt).toLocaleString()}
                </span>
              </div>

              {message.organization && (
                <p className={styles.subtitle}>
                  Organization: {message.organization}
                </p>
              )}

              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {message.message}
              </p>

              <p className={styles.subtitle}>
                Notification: {message.notificationStatus}
                {message.notificationProviderId
                  ? ` · provider ${message.notificationProviderId}`
                  : ''}
                {` · ${message.notificationAttempts} attempt${message.notificationAttempts === 1 ? '' : 's'}`}
                {` · retained until ${new Date(message.retentionExpiresAt).toLocaleDateString()}`}
              </p>
              {message.notificationLastAttemptAt && (
                <p className={styles.subtitle}>
                  Last attempt:{' '}
                  {new Date(message.notificationLastAttemptAt).toLocaleString()}
                </p>
              )}
              {retryable && (
                <p className={styles.subtitle}>
                  Next automatic attempt:{' '}
                  {new Date(message.notificationNextAttemptAt).toLocaleString()}
                </p>
              )}
              {hasLease && (
                <p className={styles.subtitle}>
                  Worker lease until:{' '}
                  {new Date(message.notificationClaimExpiresAt!).toLocaleString()}
                </p>
              )}
              {message.notificationLastError && (
                <p className={styles.subtitle}>
                  Last notification error: {message.notificationLastError}
                </p>
              )}

              <div
                className={styles.rowActions}
                style={{ justifyContent: 'flex-start', marginTop: 14 }}
              >
                <a
                  href={`mailto:${message.email}?subject=Re: your message`}
                  className={styles.button}
                >
                  Reply
                </a>
                <form action={markMessageRead}>
                  <input type="hidden" name="id" value={message.id} />
                  <input
                    type="hidden"
                    name="read"
                    value={message.read ? 'false' : 'true'}
                  />
                  <button type="submit" className={styles.button}>
                    {message.read ? 'Mark unread' : 'Mark read'}
                  </button>
                </form>
                {message.notificationStatus !== 'sent' && (
                  <form action={retryContactNotification}>
                    <input type="hidden" name="id" value={message.id} />
                    <button type="submit" className={styles.button}>
                      Retry notification
                    </button>
                  </form>
                )}
                <form action={deleteMessage}>
                  <input type="hidden" name="id" value={message.id} />
                  <button
                    type="submit"
                    className={`${styles.button} ${styles.buttonDanger}`}
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
