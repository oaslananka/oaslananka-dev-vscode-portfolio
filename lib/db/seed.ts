import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import {
  defaultPosts,
  defaultProfile,
  defaultProjects,
  defaultSettings,
} from './defaults';
import {
  posts as postsTable,
  profile as profileTable,
  projects as projectsTable,
  siteSettings as settingsTable,
} from './schema';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set — run the seed command through Doppler.',
    );
  }

  const db = drizzle({ client: neon(url) });

  console.log('→ Seeding profile…');
  const existingProfile = await db.select().from(profileTable).limit(1);
  if (existingProfile.length === 0) {
    await db.insert(profileTable).values({ id: 1, ...defaultProfile });
    console.log('  ✓ profile inserted');
  } else {
    console.log('  • profile already exists, skipping');
  }

  console.log('→ Seeding site settings…');
  const existingSettings = await db.select().from(settingsTable).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(settingsTable).values({ id: 1, ...defaultSettings });
    console.log('  ✓ settings inserted');
  } else {
    console.log('  • settings already exist, skipping');
  }

  console.log('→ Seeding projects…');
  const existingProjects = await db.select().from(projectsTable).limit(1);
  if (existingProjects.length === 0 && defaultProjects.length > 0) {
    await db.insert(projectsTable).values(defaultProjects);
    console.log(`  ✓ ${defaultProjects.length} projects inserted`);
  } else {
    console.log('  • projects already exist or none to seed, skipping');
  }

  console.log('→ Seeding posts…');
  const existingPosts = await db.select().from(postsTable).limit(1);
  if (existingPosts.length === 0 && defaultPosts.length > 0) {
    await db.insert(postsTable).values(defaultPosts);
    console.log(`  ✓ ${defaultPosts.length} posts inserted`);
  } else {
    console.log('  • posts already exist or none to seed, skipping');
  }

  console.log('\n✅ Seed complete.');
}

main().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
