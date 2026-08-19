import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export function LangToggle() {
  const { i18n } = useTranslation();

  function toggle() {
    const next = i18n.language === 'pt-BR' ? 'en' : 'pt-BR';
    void i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  }

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
      aria-label="Mudar idioma / Change language"
    >
      <Languages size={18} />
      {i18n.language === 'pt-BR' ? 'PT-BR' : 'EN'}
    </button>
  );
}
