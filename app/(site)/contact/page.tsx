import type { Metadata } from 'next';

import ContactCode from '@/components/ContactCode';
import ContactForm from '@/components/ContactForm';
import JsonLd from '@/components/JsonLd';
import { getProfile } from '@/lib/content';
import { publicContactChannels } from '@/lib/person-identity';
import { profileAvailabilityCopy } from '@/lib/profile-content';
import { breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import styles from '@/styles/ContactPage.module.css';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();

  return buildPageMetadata({
    title: 'Contact',
    description: `Contact ${profile.name} about engineering projects, role opportunities and technical collaboration.`,
    path: '/contact',
  });
}

export default async function ContactPage() {
  const profile = await getProfile();

  return (
    <div className={styles.layout}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ])}
      />
      <h1 className={styles.pageTitle}>Contact Me</h1>
      <p className={styles.pageSubtitle}>
        {profileAvailabilityCopy(profile.availableForWork)}
      </p>
      <div className={styles.container}>
        <section className={styles.formColumn}>
          <h2 className={styles.sectionTitle}>Send a message</h2>
          <ContactForm />
        </section>
        <section className={styles.contactContainer}>
          <h2 className={styles.sectionTitle}>Other contact channels</h2>
          <ContactCode socials={publicContactChannels(profile)} />
        </section>
      </div>
    </div>
  );
}
