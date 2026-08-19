import assert from 'node:assert/strict';
import test from 'node:test';
import { getTableConfig } from 'drizzle-orm/pg-core';

import {
  contactMessages,
  posts,
  profile,
  projects,
  siteSettings,
} from '../lib/db/schema';

function checkNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).checks.map((constraint) => constraint.name);
}

test('admin-managed tables expose named database invariants', () => {
  assert.deepEqual(checkNames(profile).sort(), [
    'profile_bio_shape_check',
    'profile_education_shape_check',
    'profile_experience_shape_check',
    'profile_singleton_id_check',
    'profile_skills_shape_check',
    'profile_socials_shape_check',
    'profile_writing_shape_check',
  ]);

  assert.deepEqual(checkNames(siteSettings).sort(), [
    'site_settings_keywords_shape_check',
    'site_settings_singleton_id_check',
    'site_settings_theme_check',
  ]);

  assert.deepEqual(checkNames(projects).sort(), [
    'projects_links_shape_check',
    'projects_media_shape_check',
    'projects_outcomes_shape_check',
    'projects_sort_order_check',
    'projects_tags_shape_check',
  ]);

  assert.deepEqual(checkNames(posts).sort(), [
    'posts_published_at_finite_check',
    'posts_tags_shape_check',
  ]);

  assert.deepEqual(checkNames(contactMessages).sort(), [
    'contact_messages_inquiry_type_check',
    'contact_messages_notification_attempts_check',
    'contact_messages_notification_status_check',
    'contact_messages_retention_window_check',
  ]);
});
