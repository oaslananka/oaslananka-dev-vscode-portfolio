'use client';

import { useState, useRef, useEffect } from 'react';
import { VscTerminal, VscClose } from '@/components/UiIcons';

import type { SiteShellData } from '@/lib/site-shell';
import { THEME_KEYS, isThemeKey } from '@/lib/themes';
import styles from '@/styles/Terminal.module.css';

interface TerminalLine {
  type: 'input' | 'output' | 'error';
  content: string;
}

const buildCommands = (
  profile: SiteShellData
): Record<string, () => string[]> => {
  const firstName = profile.name.split(' ')[0] || profile.name;
  const pad = (label: string) => `${label}:`.padEnd(12);

  return {
    help: () => [
      'Available commands:',
      '  help      - Show this help message',
      '  about     - About me',
      '  skills    - My technical skills',
      '  projects  - View my projects',
      '  contact   - Contact information',
      '  theme     - Change theme (usage: theme <name>)',
      '  themes    - List available themes',
      '  clear     - Clear terminal',
      '  date      - Show current date',
      '  whoami    - Who am I?',
      '  ls        - List directory contents',
      '  pwd       - Print working directory',
      '  echo      - Echo text (usage: echo <text>)',
    ],
    about: () => [
      `Hi, I'm ${firstName}!`,
      profile.tagline,
      ...(profile.bioIntroduction ? [profile.bioIntroduction] : []),
    ],
    skills: () => [
      'Technical Skills:',
      ...profile.skills.map((s) => `  ${pad(s.category)}${s.items.join(', ')}`),
    ],
    projects: () => [
      'Featured Projects:',
      '  Visit the Projects tab to explore my work.',
    ],
    contact: () => [
      'Contact Information:',
      ...profile.socials.map((s) => `  ${pad(s.platform)}${s.label}`),
    ],
    themes: () => [
      'Available themes:',
      ...THEME_KEYS.map(
        (theme, i) => `  ${theme}${i === 0 ? '  (default)' : ''}`
      ),
      '',
      'Use "theme <name>" to change theme.',
    ],
    date: () => [new Date().toString()],
    whoami: () => ['visitor@portfolio ~ exploring awesome projects'],
    ls: () => ['about/', 'projects/', 'skills/', 'contact/', 'README.md'],
    pwd: () => ['/home/visitor/portfolio'],
  };
};

const processCommand = (input: string, profile: SiteShellData): TerminalLine[] => {
  const commands = buildCommands(profile);
  const trimmed = input.trim();
  const lines: TerminalLine[] = [{ type: 'input', content: `$ ${trimmed}` }];

  if (!trimmed) {
    return lines;
  }

  const parts = trimmed.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (cmd === 'clear') {
    return [];
  }

  if (cmd === 'theme' && args[0]) {
    if (isThemeKey(args[0])) {
      document.documentElement.setAttribute('data-theme', args[0]);
      localStorage.setItem('theme', args[0]);
      lines.push({ type: 'output', content: `Theme changed to ${args[0]}` });
    } else {
      lines.push({ type: 'error', content: `Unknown theme: ${args[0]}. Type "themes" for available options.` });
    }
    return lines;
  }

  if (cmd === 'theme') {
    lines.push({ type: 'error', content: 'Usage: theme <name>. Type "themes" for available options.' });
    return lines;
  }

  if (cmd === 'echo') {
    lines.push({ type: 'output', content: args.join(' ') });
    return lines;
  }

  if (commands[cmd]) {
    const output = commands[cmd]();
    output.forEach(line => {
      lines.push({ type: 'output', content: line });
    });
  } else {
    lines.push({ type: 'error', content: `Command not found: ${cmd}. Type "help" for available commands.` });
  }

  return lines;
};

interface TerminalProps {
  onToggle: () => void;
  shell: SiteShellData;
}

const Terminal = ({ onToggle, shell }: TerminalProps) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'output', content: 'Welcome to the interactive terminal!' },
    { type: 'output', content: 'Type "help" for available commands.' },
    { type: 'output', content: '' },
  ]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();

    if (trimmed === 'clear') {
      setLines([]);
    } else {
      const newLines = processCommand(input, shell);
      setLines(prev => [...prev, ...newLines]);
    }

    if (trimmed) {
      setCommandHistory(prev => [...prev, trimmed]);
    }
    setHistoryIndex(-1);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const focusCommandInput = () => {
    inputRef.current?.focus();
  };

  return (
    <section className={styles.terminal} aria-label="Interactive terminal">
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <VscTerminal className={styles.terminalIcon} aria-hidden="true" />
          <span>Terminal</span>
        </div>
        <div className={styles.headerRight}>
          <button
            type="button"
            onClick={focusCommandInput}
            className={styles.headerBtn}
            title="Focus terminal command"
            aria-label="Focus terminal command"
          >
            <VscTerminal size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={styles.headerBtn}
            title="Close terminal"
            aria-label="Close terminal"
          >
            <VscClose size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={styles.body} ref={terminalRef}>
        <div className={styles.output} aria-live="polite" aria-atomic="false">
          {lines.map((line, index) => (
            <div
              key={index}
              className={`${styles.line} ${
                line.type === 'error'
                  ? styles.error
                  : line.type === 'input'
                    ? styles.input
                    : ''
              }`}
            >
              {line.content}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className={styles.inputLine}>
          <span className={styles.prompt}>$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className={styles.input}
            autoComplete="off"
            spellCheck={false}
            aria-label="Terminal command"
          />
        </form>
      </div>
    </section>
  );
};

export default Terminal;
