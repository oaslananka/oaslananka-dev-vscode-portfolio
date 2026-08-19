'use client';

import Link from 'next/link';
import {
  VscBell,
  VscBook,
  VscCheck,
  VscError,
  VscWarning,
  VscSourceControl,
  VscTerminal,
  SiNextdotjs,
} from '@/components/UiIcons';

import styles from '@/styles/Bottombar.module.css';

interface BottombarProps {
  readonly githubUrl: string;
  readonly onTerminalToggle: () => void;
  readonly isTerminalOpen: boolean;
}

const Bottombar = ({
  githubUrl,
  onTerminalToggle,
  isTerminalOpen,
}: BottombarProps) => {
  return (
    <footer className={styles.bottomBar} aria-label="Editor status bar">
      <div className={styles.container}>
        <a
          href={githubUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={styles.section}
          aria-label="main — Open GitHub profile in a new tab"
        >
          <VscSourceControl className={styles.icon} aria-hidden="true" />
          <span>main</span>
        </a>
        <output className={styles.section} aria-label="No errors or warnings">
          <VscError className={styles.icon} aria-hidden="true" />
          <span className={styles.errorText}>0</span>&nbsp;&nbsp;
          <VscWarning className={styles.icon} aria-hidden="true" />
          <span>0</span>
        </output>
      </div>
      <div className={styles.container}>
        <button
          type="button"
          className={`${styles.section} ${styles.sectionButton} ${
            isTerminalOpen ? styles.active : ''
          }`}
          onClick={onTerminalToggle}
          title="Toggle Terminal (Ctrl+`)"
          aria-label="Toggle terminal"
          aria-pressed={isTerminalOpen}
        >
          <VscTerminal className={styles.icon} aria-hidden="true" />
        </button>
        <div className={styles.section}>
          <SiNextdotjs className={styles.icon} aria-hidden="true" />
          <span>Powered by Next.js</span>
        </div>
        <Link href="/glossary" className={styles.section}>
          <VscBook className={styles.icon} aria-hidden="true" />
          <span>Glossary</span>
        </Link>
        <output className={styles.section} aria-label="Prettier is active">
          <VscCheck className={styles.icon} aria-hidden="true" />
          <span>Prettier</span>
        </output>
        <output className={styles.section} aria-label="No notifications">
          <VscBell aria-hidden="true" />
        </output>
      </div>
    </footer>
  );
};

export default Bottombar;
