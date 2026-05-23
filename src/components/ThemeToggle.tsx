import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? t('layout.theme.light') : t('layout.theme.dark')}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      {theme === 'dark' ? t('layout.theme.light') : t('layout.theme.dark')}
    </button>
  );
}
