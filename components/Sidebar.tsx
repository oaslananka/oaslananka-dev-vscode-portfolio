'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  VscAccount,
  VscSettings,
  VscMail,
  VscGithubAlt,
  VscCode,
  VscFiles,
  VscEdit,
} from '@/components/UiIcons';
import type { IconType } from '@/components/UiIcons';

import styles from '@/styles/Sidebar.module.css';

interface NavigationItem {
  Icon: IconType;
  path: string;
  label: string;
  mobileHidden?: boolean;
}

const sidebarTopItems: NavigationItem[] = [
  { Icon: VscFiles, path: '/', label: 'Home' },
  {
    Icon: VscGithubAlt,
    path: '/github',
    label: 'GitHub activity',
    mobileHidden: true,
  },
  { Icon: VscCode, path: '/projects', label: 'Projects' },
  { Icon: VscEdit, path: '/articles', label: 'Articles' },
  { Icon: VscMail, path: '/contact', label: 'Contact' },
];

const sidebarBottomItems: NavigationItem[] = [
  { Icon: VscAccount, path: '/about', label: 'About' },
  {
    Icon: VscSettings,
    path: '/settings',
    label: 'Settings',
    mobileHidden: true,
  },
];

const Sidebar = () => {
  const pathname = usePathname();

  const renderItem = ({
    Icon,
    path,
    label,
    mobileHidden,
  }: NavigationItem) => {
    const isActive =
      pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));

    return (
      <Link
        href={path}
        prefetch={path === '/github' ? false : undefined}
        key={path}
        className={`${styles.iconContainer} ${
          isActive ? styles.active : ''
        } ${mobileHidden ? styles.mobileHidden : ''}`}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
        title={label}
      >
        <Icon
          size={20}
          className={styles.icon}
          aria-hidden="true"
        />
      </Link>
    );
  };

  return (
    <aside className={styles.sidebar} aria-label="Primary navigation">
      <nav className={styles.sidebarTop} aria-label="Main pages">
        {sidebarTopItems.map(renderItem)}
      </nav>
      <nav className={styles.sidebarBottom} aria-label="Profile and preferences">
        {sidebarBottomItems.map(renderItem)}
      </nav>
    </aside>
  );
};

export default Sidebar;
