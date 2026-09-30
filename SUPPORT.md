# Support

## Public support

Use GitHub Issues for reproducible bugs and feature requests that do not contain secrets, personal data, private customer information, or vulnerability details.

Include the affected route or component, expected and observed behavior, reproduction steps, browser/runtime details when relevant, and logs with credentials or authored contact content removed.

## Security

Security reports belong in GitHub private vulnerability reporting as described in `SECURITY.md`. Do not publish exploit steps, tokens, credentials, database URLs, contact-message content, or Cloudflare/Doppler/Vercel secrets in an issue or discussion.

## Operational incidents

For database recovery use `docs/operations/neon-recovery.md`. For contact delivery use `docs/operations/contact-notification-delivery.md`. For deployment-environment behavior use `docs/operations/deployment-environments.md`.

Operational changes must preserve evidence and rollback paths. Do not bypass protected checks because an incident is urgent; use a minimal reviewed fix and verify the affected path after recovery.
