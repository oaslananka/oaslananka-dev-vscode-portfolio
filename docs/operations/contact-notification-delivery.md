# Contact notification delivery

Contact form submissions are persisted before any email attempt. The `contact_messages` table is also the durable delivery queue, so a provider outage or terminated function does not lose the notification job.

## State model

| Status | Meaning | Automatic worker behavior |
| --- | --- | --- |
| `disabled` | `RESEND_API_KEY` is not configured | Never claimed |
| `pending` | Waiting for its first or next eligible attempt | Claimed after `notification_next_attempt_at` |
| `sent` | Resend accepted the idempotent request | Never claimed again |
| `failed` | Terminal after six attempts, or legacy failure below the limit | Below six attempts it can be recovered; at six it requires manual review |

Each provider request uses `portfolio-contact-{messageId}` as its stable idempotency key.

## Retry policy

A durable attempt is counted immediately before the provider call. Failed attempts become eligible after these minimum delays:

1. 5 minutes
2. 30 minutes
3. 2 hours
4. 12 hours
5. 24 hours

Attempt six is terminal. The repository's default Vercel Cron schedule calls `/api/cron/contact-notifications` daily at **04:07 UTC** so the configuration also deploys on Hobby plans. Vercel Pro or an external scheduler may call the endpoint more frequently; the stored `notification_next_attempt_at` timestamp still prevents premature retries.

## Concurrency and recovery

`public.claim_contact_notifications(...)` performs one atomic claim with `FOR UPDATE SKIP LOCKED`. A claim has a five-minute lease and token. Every attempt/result update must match that token, so:

- concurrent workers receive disjoint rows;
- an active lease prevents duplicate work;
- an expired lease can be reclaimed;
- a stale worker cannot overwrite a newer result.

If the provider accepts an email but the function terminates before `sent` is persisted, the next worker repeats the request with the same provider idempotency key.

## Scheduled endpoint

Vercel sends a GET request to:

```text
/api/cron/contact-notifications
```

The route requires:

```text
Authorization: Bearer <CRON_SECRET>
```

It always returns `Cache-Control: no-store`. When Resend is intentionally disabled, an authenticated run returns a successful no-op with `configured: false`.

On another scheduler, invoke the same endpoint no more frequently than operationally necessary. Do not place `CRON_SECRET` in command history, logs, URLs, or monitoring labels.

## Admin inspection and manual redrive

Open `/admin/messages` to inspect:

- notification status;
- attempt count;
- last attempt time;
- next automatic attempt;
- active/expired lease timestamp;
- last provider error;
- terminal failure badge.

Use **Retry notification** only after reviewing the provider error and configuration. Manual retry resets attempts, provider ID, last error, attempt time, next attempt, and lease data. If Resend is configured, an immediate worker pass follows; otherwise the record becomes `disabled`.

## Read-only database inspection

Use a read-only connection and avoid selecting message bodies unless incident response requires them.

Queue summary:

```sql
SELECT
  notification_status,
  count(*) AS messages,
  min(notification_next_attempt_at) AS earliest_next_attempt
FROM contact_messages
GROUP BY notification_status
ORDER BY notification_status;
```

Terminal failures without contact content:

```sql
SELECT
  id,
  notification_attempts,
  notification_last_attempt_at,
  notification_last_error,
  created_at
FROM contact_messages
WHERE notification_status = 'failed'
  AND notification_attempts >= 6
ORDER BY notification_last_attempt_at DESC NULLS LAST;
```

Expired leases:

```sql
SELECT id, notification_claim_expires_at
FROM contact_messages
WHERE notification_claim_token <> ''
  AND notification_claim_expires_at <= now()
ORDER BY notification_claim_expires_at;
```

Expired leases are recoverable automatically; do not clear them manually unless the claim function itself is unavailable.

## Monitoring

Terminal delivery failures are reported to Sentry with:

- component tag `contact-notification-terminal`;
- message ID;
- durable attempt count.

Contact name, email, organization, and message body are not attached as Sentry metadata. The cron route reports infrastructure-level failures under `contact-notification-cron`.

## Verification

CI applies migrations before tests and uses disposable PostgreSQL for:

- atomic rate-limit behavior;
- concurrent notification claim exclusivity;
- migration/build validation;
- admin terminal-state and manual-reset Playwright coverage;
- cron authentication and no-store behavior.
