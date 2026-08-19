'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';

import Titlebar from '@/components/Titlebar';
import Sidebar from '@/components/Sidebar';
import Explorer from '@/components/Explorer';
import Bottombar from '@/components/Bottombar';
import Tabsbar from '@/components/Tabsbar';
import type { SiteShellData } from '@/lib/site-shell';

import styles from '@/styles/Layout.module.css';

const Terminal = dynamic(() => import('@/components/Terminal'), {
  ssr: false,
});

const CommandPalette = dynamic(() => import('@/components/CommandPalette'), {
  ssr: false,
});

interface LayoutProps {
  children: React.ReactNode;
  shell: SiteShellData;
}

const Layout = ({ children, shell }: LayoutProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [chordKey, setChordKey] = useState<string | null>(null);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleTerminal = useCallback(() => {
    setIsTerminalOpen(prev => !prev);
  }, []);

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  useEffect(() => {
    const main = document.getElementById('main-editor');
    if (main) {
      main.scrollTop = 0;
    }
  }, [pathname]);

  useEffect(() => {
    const navigationRoutes: Record<string, string> = {
      'h': '/',
      'a': '/about',
      'p': '/projects',
      'r': '/articles',
      'c': '/contact',
      'g': '/github',
      'l': '/glossary',
      's': '/settings',
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCommandPaletteOpen) return;

      // Browser extensions and synthetic events can dispatch `keydown` without
      // the KeyboardEvent `key` field. Ignore those events instead of crashing.
      if (typeof e.key !== 'string' || !e.key) return;

      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        toggleTerminal();
        return;
      }

      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'p') {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      if (chordKey === 'g' && navigationRoutes[key]) {
        e.preventDefault();
        router.push(navigationRoutes[key]);
        setChordKey(null);
        return;
      }

      if (chordKey === 'k' && key === 't') {
        e.preventDefault();
        openCommandPalette();
        setChordKey(null);
        return;
      }

      const isTyping =
        e.target instanceof Element &&
        Boolean(e.target.closest('input, textarea, select, [contenteditable="true"]'));

      if ((key === 'g' || key === 'k') && !isTyping) {
        e.preventDefault();
        setChordKey(key);
        if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
        chordTimerRef.current = setTimeout(() => setChordKey(null), 2000);
        return;
      }

      if (chordKey && key !== chordKey) {
        setChordKey(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
    };
  }, [toggleTerminal, openCommandPalette, chordKey, router, isCommandPaletteOpen]);

  return (
    <div className={styles.layout}>
        <a className={styles.skipLink} href="#main-editor">
          Skip to content
        </a>
        <Titlebar name={shell.name} onOpenCommandPalette={openCommandPalette} />
        <div className={styles.main}>
          <Sidebar />
          <Explorer />
          <div className={styles.editorContainer}>
            <Tabsbar />
            <div className={styles.editorWithTerminal}>
              <main id="main-editor" className={styles.content} tabIndex={-1}>
                {children}
              </main>
              {isTerminalOpen && <Terminal onToggle={toggleTerminal} shell={shell} />}
            </div>
          </div>
        </div>
        <Bottombar
          githubUrl={shell.githubUrl}
          onTerminalToggle={toggleTerminal}
          isTerminalOpen={isTerminalOpen}
        />
        {isCommandPaletteOpen && (
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={closeCommandPalette}
            onToggleTerminal={toggleTerminal}
            isTerminalOpen={isTerminalOpen}
          />
        )}
    </div>
  );
};

export default Layout;
