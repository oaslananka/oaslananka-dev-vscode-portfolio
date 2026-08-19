# Admin perimeter with Cloudflare Access

The application can require Cloudflare Access before the existing password and
signed-session checks. This creates two independent layers:

1. Cloudflare Access authenticates the operator and signs a JWT.
2. The application verifies that JWT, then requires the existing admin password.

## Configuration

Create a dedicated proxied admin hostname, protect the entire hostname with a
Cloudflare Access self-hosted application, then configure all four variables in
the same Doppler environment:

- `ADMIN_ACCESS_HOST` — dedicated hostname such as `admin.example.com`
- `CF_ACCESS_TEAM_DOMAIN` — `https://<team>.cloudflareaccess.com`
- `CF_ACCESS_AUD` — the application audience tag from Cloudflare Access
- `ADMIN_ACCESS_EMAILS` — comma- or newline-separated exact email allowlist

The feature is disabled only when all four variables are absent. A partial or
invalid configuration fails closed with HTTP 503. When enabled, admin requests
on the public hostname redirect to `ADMIN_ACCESS_HOST` before JWT verification.
A missing, expired, wrongly issued, wrong-audience, or non-allowlisted Access JWT
returns HTTP 403.

## Origin requirements

The origin must receive `Cf-Access-Jwt-Assertion` from Cloudflare Access. Do not
replace JWT verification with trust in `Cf-Access-Authenticated-User-Email` or
another client-controllable header. Ensure direct origin access is not possible
outside Cloudflare/Vercel routing, and keep the password layer enabled.

## Rollout

1. Deploy the code with all four variables absent.
2. Add the dedicated admin hostname to the Vercel project.
3. Create a proxied Cloudflare DNS record for only that hostname. Keep the public
   site hostname DNS-only so its traffic continues to reach Vercel directly.
4. Protect the entire dedicated hostname with an Access application and an exact
   email Allow policy.
5. Add the four variables to Preview and verify allowed/denied identities.
6. Add them to Production and redeploy.
7. Confirm the public `/admin/login` redirects to the dedicated hostname, an
   unauthenticated request receives the Access login page, and the application
   password is still required after Access succeeds.
8. Roll back by removing all four variables and redeploying before disabling the
   Access application or DNS proxy.
