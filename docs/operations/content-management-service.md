# Shared content mutation service — preparation for AI writes

All existing authenticated `/admin` mutations now delegate to
`lib/content-management/mutations.ts`. The module retains existing PostgreSQL
writes, revalidation of public and machine-readable routes, OpenGraph refresh,
and IndexNow notification rules. It is `server-only` and deliberately does not
export a Server Action or a public API handler.

**Caller requirements:** authenticate first; validate the complete content
record using `lib/admin/validation.ts`; parse IDs using `parseSafeId`. The
current `/admin` adapters continue to do this, preserving redirect and error
messages. The new service is not a security boundary; never expose it in an
API handler without separate agent auth, authorization, revision checking,
audit/rollback, and bounded request validation.

This commit does not grant any additional agent write access, change secrets,
provision object storage, add a database migration, or alter public paths.
A later PR will add controlled JSON mutation adapters with an audit trail and
concurrency control, then a separately verified media transfer mechanism.
