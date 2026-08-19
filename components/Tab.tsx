'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import styles from '@/styles/Tab.module.css';

interface TabProps {
  icon: string;
  filename: string;
  path: string;
}

const Tab = ({ icon, filename, path }: TabProps) => {
  const pathname = usePathname();
  const tabRef = useRef<HTMLAnchorElement>(null);
  const isActive =
    pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));

  useEffect(() => {
    if (!isActive) return;

    const tab = tabRef.current;
    const tabs = tab?.parentElement;
    if (!tab || !tabs) return;

    const tabStart = tab.offsetLeft;
    const tabEnd = tabStart + tab.offsetWidth;
    const visibleStart = tabs.scrollLeft;
    const visibleEnd = visibleStart + tabs.clientWidth;

    if (tabStart < visibleStart) {
      tabs.scrollTo({ left: tabStart, behavior: 'auto' });
    } else if (tabEnd > visibleEnd) {
      tabs.scrollTo({ left: tabEnd - tabs.clientWidth, behavior: 'auto' });
    }
  }, [isActive, pathname]);

  return (
    <Link
      href={path}
      prefetch={path === '/github' ? false : undefined}
      className={`${styles.tab} ${isActive ? styles.active : ''}`}
      aria-current={isActive ? 'page' : undefined}
      ref={tabRef}
    >
      <Image src={icon} alt="" height={18} width={18} />
      <span>{filename}</span>
    </Link>
  );
};

export default Tab;
