import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';

const databaseUrl = process.env.DB_PREFLIGHT_TEST_DATABASE_URL;

test(
  'database rejects admin content that violates critical invariants',
  { skip: databaseUrl ? false : 'Set DB_PREFLIGHT_TEST_DATABASE_URL to a migrated, disposable PostgreSQL database.' },
  async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query('begin');

    async function expectCheckViolation(
      name: string,
      query: string,
      values: unknown[] = [],
    ): Promise<void> {
      await client.query(`savepoint ${name}`);
      await assert.rejects(
        () => client.query(query, values),
        (error: unknown) =>
          Boolean(
            error &&
              typeof error === 'object' &&
              'code' in error &&
              (error as { code?: string }).code === '23514',
          ),
      );
      await client.query(`rollback to savepoint ${name}`);
    }

    try {
      await expectCheckViolation(
        'bad_profile',
        `insert into profile
          (id, name, role, tagline, hero_description)
         values (2000000000, 'Test', 'Engineer', 'Tagline', 'Description')`,
      );
      await expectCheckViolation(
        'too_many_education_records',
        `update profile set education = $1::jsonb where id = 1`,
        [
          JSON.stringify(
            Array.from({ length: 11 }, (_, index) => ({
              institution: `Institution ${index}`,
              qualification: 'Qualification',
              details: '',
            })),
          ),
        ],
      );
      await expectCheckViolation(
        'bad_settings',
        `insert into site_settings
          (id, site_title, site_description, default_theme)
         values (2000000000, 'Test', 'Description', 'unsupported-theme')`,
      );
      await expectCheckViolation(
        'bad_project_order',
        `insert into projects
          (slug, title, description, sort_order)
         values ('invalid-sort-order-test', 'Test', 'Description', 10001)`,
      );
      await expectCheckViolation(
        'bad_post_date',
        `insert into posts
          (slug, title, published_at)
         values ('invalid-date-test', 'Test', 'infinity')`,
      );
      await expectCheckViolation(
        'bad_inquiry_type',
        `insert into contact_messages
          (name, email, inquiry_type, message)
         values ('Test', 'test@example.com', 'invalid', 'Message')`,
      );
      await expectCheckViolation(
        'bad_notification_status',
        `insert into contact_messages
          (name, email, notification_status, message)
         values ('Test', 'test@example.com', 'invalid', 'Message')`,
      );
      await expectCheckViolation(
        'bad_notification_attempts',
        `insert into contact_messages
          (name, email, notification_attempts, message)
         values ('Test', 'test@example.com', -1, 'Message')`,
      );
    } finally {
      await client.query('rollback');
      await client.end();
    }
  },
);
