# AI content JSON validation

`lib/content-management/json-input.ts` parses untrusted JSON for profile,
settings, project and article updates using exactly the Zod contracts currently
used by `/admin`. The caller supplies the current trusted database record to
implement shallow PATCH behavior: omitted top-level fields remain unchanged;
provided arrays are replaced atomically, not merged by index.

Unknown fields, record metadata (`id`, `createdAt`, `updatedAt`), empty patches,
non-object payloads, invalid URLs/images, broken cover/alt relationships and
all existing maximum sizes fail closed. Blog `publishedAt` is accepted only as
a UTC ISO 8601 string, normalized to a Date before shared validation.

These are pure validation functions, **not authorization or publishing routes**.
Future handlers must authenticate, enforce write policy, fetch an uncached
current record, check a revision precondition, call these validators, preserve
an atomic revision/audit history and only then invoke the content service.
Do not expose a PATCH route until the above is implemented and tested.
