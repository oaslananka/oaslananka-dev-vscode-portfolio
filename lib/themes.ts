export interface ThemeInfo {
  name: string;
  theme: string;
  icon: string;
  publisher: string;
}

export const THEMES = [
  {
    name: 'GitHub Dark',
    theme: 'github-dark',
    icon: '/themes/github-dark.png',
    publisher: 'GitHub',
  },
  {
    name: 'Dracula',
    theme: 'dracula',
    icon: '/themes/dracula.png',
    publisher: 'Dracula Theme',
  },
  {
    name: 'Ayu Dark',
    theme: 'ayu-dark',
    icon: '/themes/ayu.png',
    publisher: 'teabyii',
  },
  {
    name: 'Ayu Mirage',
    theme: 'ayu-mirage',
    icon: '/themes/ayu.png',
    publisher: 'teabyii',
  },
  {
    name: 'Nord',
    theme: 'nord',
    icon: '/themes/nord.png',
    publisher: 'arcticicestudio',
  },
  {
    name: 'Night Owl',
    theme: 'night-owl',
    icon: '/themes/night-owl.png',
    publisher: 'sarah.drasner',
  },
] as const satisfies readonly ThemeInfo[];

export type ThemeKey = (typeof THEMES)[number]['theme'];

export const THEME_KEYS = THEMES.map((theme) => theme.theme) as ThemeKey[];
export const DEFAULT_THEME: ThemeKey = 'github-dark';

const THEME_KEY_SET = new Set<string>(THEME_KEYS);

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && THEME_KEY_SET.has(value);
}
