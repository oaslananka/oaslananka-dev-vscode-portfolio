'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  VscAccount,
  VscArrowLeft,
  VscBook,
  VscClose,
  VscCode,
  VscColorMode,
  VscGear,
  VscGithubAlt,
  VscGoToFile,
  VscHome,
  VscMail,
  VscSymbolColor,
  VscTerminal,
  MdNavigateNext,
} from '@/components/UiIcons';

import { THEMES } from '@/lib/themes';
import styles from '@/styles/CommandPalette.module.css';

interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  icon: ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleTerminal: () => void;
  isTerminalOpen: boolean;
}

const optionId = (id: string) => `command-palette-option-${id}`;

const NAVIGATION_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End'] as const;

const computeNavigationIndex = (
  key: (typeof NAVIGATION_KEYS)[number],
  activeIndex: number,
  resultCount: number,
): number | null => {
  if (resultCount === 0) return null;
  switch (key) {
    case 'ArrowDown':
      return (activeIndex + 1) % resultCount;
    case 'ArrowUp':
      return (activeIndex - 1 + resultCount) % resultCount;
    case 'Home':
      return 0;
    case 'End':
      return resultCount - 1;
  }
};

const CommandPalette = ({
  isOpen,
  onClose,
  onToggleTerminal,
  isTerminalOpen,
}: CommandPaletteProps) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: 'go-home',
        label: 'Go to Home',
        category: 'Navigation',
        shortcut: 'G H',
        icon: <VscHome size={16} />,
        action: () => router.push('/'),
      },
      {
        id: 'go-about',
        label: 'Go to About',
        category: 'Navigation',
        shortcut: 'G A',
        icon: <VscAccount size={16} />,
        action: () => router.push('/about'),
      },
      {
        id: 'go-projects',
        label: 'Go to Projects',
        category: 'Navigation',
        shortcut: 'G P',
        icon: <VscCode size={16} />,
        action: () => router.push('/projects'),
      },
      {
        id: 'go-articles',
        label: 'Go to Articles',
        category: 'Navigation',
        shortcut: 'G R',
        icon: <VscBook size={16} />,
        action: () => router.push('/articles'),
      },
      {
        id: 'go-contact',
        label: 'Go to Contact',
        category: 'Navigation',
        shortcut: 'G C',
        icon: <VscMail size={16} />,
        action: () => router.push('/contact'),
      },
      {
        id: 'go-glossary',
        label: 'Go to Glossary',
        category: 'Navigation',
        shortcut: 'G L',
        icon: <VscBook size={16} />,
        action: () => router.push('/glossary'),
      },
      {
        id: 'go-github',
        label: 'Go to GitHub',
        category: 'Navigation',
        shortcut: 'G G',
        icon: <VscGithubAlt size={16} />,
        action: () => router.push('/github'),
      },
      {
        id: 'go-settings',
        label: 'Go to Settings',
        category: 'Navigation',
        shortcut: 'G S',
        icon: <VscGear size={16} />,
        action: () => router.push('/settings'),
      },
      {
        id: 'toggle-terminal',
        label: isTerminalOpen ? 'Close Terminal' : 'Open Terminal',
        category: 'Terminal',
        shortcut: 'Ctrl+`',
        icon: <VscTerminal size={16} />,
        action: onToggleTerminal,
      },
      {
        id: 'change-theme',
        label: 'Change Color Theme',
        category: 'Preferences',
        shortcut: 'K T',
        icon: <VscSymbolColor size={16} />,
        action: () => {
          setShowThemePicker(true);
          setSearchQuery('');
          setSelectedIndex(0);
        },
      },
    ],
    [isTerminalOpen, onToggleTerminal, router],
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCommands = useMemo(
    () =>
      commands.filter(
        (command) =>
          command.label.toLowerCase().includes(normalizedQuery) ||
          command.category.toLowerCase().includes(normalizedQuery),
      ),
    [commands, normalizedQuery],
  );
  const filteredThemes = useMemo(
    () =>
      THEMES.filter((theme) =>
        theme.name.toLowerCase().includes(normalizedQuery),
      ),
    [normalizedQuery],
  );
  const resultCount = showThemePicker
    ? filteredThemes.length
    : filteredCommands.length;
  const activeIndex =
    resultCount === 0
      ? -1
      : Math.min(Math.max(selectedIndex, 0), resultCount - 1);
  const activeOptionId = (() => {
    if (activeIndex < 0) return undefined;
    if (showThemePicker) {
      const theme = filteredThemes[activeIndex];
      return theme ? optionId(theme.theme) : undefined;
    }
    const command = filteredCommands[activeIndex];
    return command ? optionId(command.id) : undefined;
  })();

  const returnToCommands = useCallback(() => {
    setShowThemePicker(false);
    setSearchQuery('');
    setSelectedIndex(0);
    inputRef.current?.focus();
  }, []);

  const handleSelect = useCallback(
    (index: number) => {
      if (index < 0) return;

      if (showThemePicker) {
        const theme = filteredThemes[index];
        if (!theme) return;

        document.documentElement.setAttribute('data-theme', theme.theme);
        localStorage.setItem('theme', theme.theme);
        onClose();
        return;
      }

      const command = filteredCommands[index];
      if (!command) return;

      command.action();
      if (command.id !== 'change-theme') onClose();
    },
    [filteredCommands, filteredThemes, onClose, showThemePicker],
  );

  const trapFocus = useCallback(
    (event: ReactKeyboardEvent<HTMLDialogElement>) => {
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'input:not([disabled]), button:not([disabled]):not([tabindex="-1"]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [],
  );

  const handleDialogKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDialogElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (showThemePicker) returnToCommands();
        else onClose();
        return;
      }

      if (event.key === 'Tab') {
        trapFocus(event);
        return;
      }

      if (event.target !== inputRef.current) return;

      if (event.key === 'Enter') {
        event.preventDefault();
        if (resultCount > 0) handleSelect(activeIndex);
        return;
      }

      if ((NAVIGATION_KEYS as readonly string[]).includes(event.key)) {
        event.preventDefault();
        const nextIndex = computeNavigationIndex(
          event.key as (typeof NAVIGATION_KEYS)[number],
          activeIndex,
          resultCount,
        );
        if (nextIndex !== null) setSelectedIndex(nextIndex);
      }
    },
    [
      handleSelect,
      onClose,
      resultCount,
      returnToCommands,
      activeIndex,
      showThemePicker,
      trapFocus,
    ],
  );

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    previouslyFocusedRef.current = previouslyFocused;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      window.requestAnimationFrame(() => previouslyFocused?.focus());
    };
  }, [isOpen]);

  useEffect(() => {
    if (!activeOptionId) return;
    document
      .getElementById(activeOptionId)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeOptionId]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className={styles.overlay}
      aria-label="Command palette"
      onCancel={(event) => {
        event.preventDefault();
        if (showThemePicker) returnToCommands();
        else onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={handleDialogKeyDown}
    >
      <div className={styles.container}>
        <div className={styles.inputWrapper}>
          {showThemePicker ? (
            <button
              type="button"
              className={styles.iconButton}
              onClick={returnToCommands}
              aria-label="Back to commands"
            >
              <VscArrowLeft aria-hidden="true" />
            </button>
          ) : (
            <VscGoToFile
              size={20}
              className={styles.inputIcon}
              aria-hidden="true"
            />
          )}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSelectedIndex(0);
            }}
            placeholder={
              showThemePicker
                ? 'Select color theme'
                : 'Type a command or search...'
            }
            className={styles.input}
            role="combobox"
            aria-label="Command palette search"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-activedescendant={activeOptionId}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-describedby="command-palette-status"
            spellCheck={false}
            autoComplete="off"
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Clear command search"
              onClick={() => {
                setSearchQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
            >
              <VscClose aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Close command palette"
            onClick={onClose}
          >
            <VscClose aria-hidden="true" />
          </button>
        </div>

        <span
          id="command-palette-status"
          className={styles.visuallyHidden}
          aria-live="polite"
        >
          {resultCount} {showThemePicker ? 'themes' : 'commands'} available
        </span>

        <div
          id="command-palette-results"
          className={styles.results}
          role="listbox"
          aria-label={showThemePicker ? 'Color themes' : 'Commands'}
        >
          {resultCount === 0 ? (
            <output className={styles.noResults} aria-live="polite">
              {showThemePicker
                ? 'No matching themes'
                : 'No matching commands'}
            </output>
          ) : showThemePicker ? (
            filteredThemes.map((theme, index) => (
              <button
                key={theme.theme}
                id={optionId(theme.theme)}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={activeIndex === index}
                aria-setsize={resultCount}
                aria-posinset={index + 1}
                className={`${styles.item} ${
                  activeIndex === index ? styles.selected : ''
                }`}
                onClick={() => handleSelect(index)}
                onPointerMove={() => setSelectedIndex(index)}
              >
                <span className={styles.itemIcon} aria-hidden="true">
                  <VscColorMode size={16} />
                </span>
                <span className={styles.itemContent}>
                  <span className={styles.itemLabel}>{theme.name}</span>
                  <span className={styles.itemDescription}>
                    {theme.publisher}
                  </span>
                </span>
              </button>
            ))
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                id={optionId(command.id)}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={activeIndex === index}
                aria-setsize={resultCount}
                aria-posinset={index + 1}
                className={`${styles.item} ${
                  activeIndex === index ? styles.selected : ''
                }`}
                onClick={() => handleSelect(index)}
                onPointerMove={() => setSelectedIndex(index)}
              >
                <span className={styles.itemIcon} aria-hidden="true">
                  {command.icon}
                </span>
                <span className={styles.itemContent}>
                  <span className={styles.itemLabel}>{command.label}</span>
                  <span className={styles.itemDescription}>
                    {command.category}
                  </span>
                </span>
                {command.shortcut && (
                  <span className={styles.shortcut} aria-hidden="true">
                    {command.id === 'change-theme' ? (
                      <MdNavigateNext size={16} />
                    ) : (
                      command.shortcut.split(' ').map((key) => (
                        <span key={key} className={styles.key}>
                          {key}
                        </span>
                      ))
                    )}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
};

export default CommandPalette;
