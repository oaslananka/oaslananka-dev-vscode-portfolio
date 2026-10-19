'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  VscAccount,
  VscCheck,
  VscDashboard,
  VscFileCode,
  VscGear,
  VscHome,
  VscMail,
  VscProject,
} from 'react-icons/vsc';

import styles from '@/styles/Admin.module.css';

const links = [
  { href: '/admin', label: 'Dashboard', icon: VscDashboard, exact: true },
  { href: '/admin/profile', label: 'Profile', icon: VscAccount },
  { href: '/admin/projects', label: 'Projects', icon: VscProject },
  { href: '/admin/posts', label: 'Blog posts', icon: VscFileCode },
  { href: '/admin/agent-approvals', label: 'AI approvals', icon: VscCheck },
  { href: '/admin/messages', label: 'Messages', icon: VscMail },
  { href: '/admin/settings', label: 'Settings', icon: VscGear },
];

export default function AdminNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav>
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        const className = `${styles.navLink} ${active ? styles.navLinkActive : ''}`;
        // Keep the owner-approval screen on document navigation. A partial
        // or stale RSC stream after protected admin authentication can end in
        // React #412 ("Connection closed") instead of a browser recovery.
        // Do not prefetch the private, dynamic approval payload.
        if (href === '/admin/agent-approvals') {
          return (
            <a key={href} href={href} className={className}>
              <Icon size={16} />
              <span>{label}</span>
            </a>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={className}
          >
            <Icon size={16} />
            <span>{label}</span>
            {href === '/admin/messages' && unreadCount > 0 && (
              <span
                className={`${styles.badge} ${styles.badgeOn}`}
                style={{ marginLeft: 'auto' }}
              >
                {unreadCount}
              </span>
            )}
          </Link>
        );
      })}
      <Link href="/" className={styles.navLink} target="_blank">
        <VscHome size={16} />
        <span>View site</span>
      </Link>
    </nav>
  );
}
