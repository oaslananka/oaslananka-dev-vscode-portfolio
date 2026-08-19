'use client';

import Image from 'next/image';
import { VscSearch } from '@/components/UiIcons';

import styles from '@/styles/Titlebar.module.css';

interface TitlebarProps {
  name: string;
  onOpenCommandPalette?: () => void;
}

const Titlebar = ({ name, onOpenCommandPalette }: TitlebarProps) => {
  return (
    <header className={styles.titlebar}>
      <Image
        src="/logos/vscode_icon.svg"
        alt=""
        aria-hidden="true"
        height={15}
        width={15}
        className={styles.icon}
      />
      <nav className={styles.items} aria-label="Application menu">
        <span>File</span>
        <span>Edit</span>
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className={styles.menuItem}
          title="Open Command Palette (Ctrl+Shift+P)"
          aria-label="Open Command Palette"
        >
          <span className={styles.paletteLabel}>View</span>
          <VscSearch className={styles.paletteIcon} aria-hidden="true" />
        </button>
        <span>Go</span>
        <span>Run</span>
        <span>Terminal</span>
        <span>Help</span>
      </nav>
      <p className={styles.title}>
        <span>{name}</span>
        <span className={styles.editorName}> - Visual Studio Code</span>
      </p>
      <div className={styles.windowButtons} aria-hidden="true">
        <span className={styles.minimize} />
        <span className={styles.maximize} />
        <span className={styles.close} />
      </div>
      <div className={styles.privacySlot} id="privacy-control-slot" />
    </header>
  );
};

export default Titlebar;
