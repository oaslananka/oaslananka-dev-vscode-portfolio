'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { VscChevronRight } from '@/components/UiIcons';

import styles from '@/styles/Explorer.module.css';

const explorerItems = [
  {
    name: 'home.tsx',
    path: '/',
    icon: '/logos/react_icon.svg',
  },
  {
    name: 'about.html',
    path: '/about',
    icon: '/logos/html_icon.svg',
  },
  {
    name: 'contact.css',
    path: '/contact',
    icon: '/logos/css_icon.svg',
  },
  {
    name: 'projects.js',
    path: '/projects',
    icon: '/logos/js_icon.svg',
  },
  {
    name: 'articles.json',
    path: '/articles',
    icon: '/logos/json_icon.svg',
  },
  {
    name: 'github.md',
    path: '/github',
    icon: '/logos/markdown_icon.svg',
  },
];

const Explorer = () => {
  const [portfolioOpen, setPortfolioOpen] = useState(true);

  return (
    <aside className={styles.explorer} aria-label="File explorer">
      <p className={styles.title}>Explorer</p>
      <div>
        <button
          type="button"
          className={styles.heading}
          aria-expanded={portfolioOpen}
          aria-controls="portfolio-files"
          onClick={() => setPortfolioOpen((isOpen) => !isOpen)}
        >
          <VscChevronRight
            className={`${styles.chevron} ${
              portfolioOpen ? styles.chevronOpen : ''
            }`}
            aria-hidden="true"
          />
          Portfolio
        </button>
        <nav
          id="portfolio-files"
          className={styles.files}
          aria-label="Portfolio files"
          hidden={!portfolioOpen}
        >
          {explorerItems.map((item) => (
            <Link
              href={item.path}
              prefetch={item.path === '/github' ? false : undefined}
              key={item.name}
              className={styles.file}
            >
              <Image src={item.icon} alt="" height={18} width={18} />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Explorer;
