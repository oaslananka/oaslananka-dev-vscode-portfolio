'use client';

import Image from 'next/image';
import { VscCheck } from '@/components/UiIcons';

import type { ThemeKey } from '@/lib/themes';

import styles from '@/styles/ThemeInfo.module.css';

interface ThemeInfoProps {
  icon: string;
  name: string;
  publisher: string;
  theme: ThemeKey;
  isActive: boolean;
  onSelect: (theme: ThemeKey) => void;
}

const ThemeInfo = ({ icon, name, publisher, theme, isActive, onSelect }: ThemeInfoProps) => {
  return (
    <button
      type="button"
      className={`${styles.card} ${isActive ? styles.active : ''}`}
      onClick={() => onSelect(theme)}
      aria-pressed={isActive}
    >
      <div className={styles.preview}>
        <Image
          src={icon}
          alt=""
          height={40}
          width={40}
          className={styles.icon}
        />
        {isActive && (
          <div className={styles.check}>
            <VscCheck size={14} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.publisher}>{publisher}</p>
      </div>
    </button>
  );
};

export default ThemeInfo;
