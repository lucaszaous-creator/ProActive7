import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { isIosSafari, isStandalone } from '@/lib/pwa';

/**
 * Convite para instalar o app na tela de início.
 *
 * Até aqui o único caminho era um botão no rodapé da gaveta lateral — que
 * no celular ficou atrás de "Mais". E no iPhone ele nunca aparecia, porque
 * `beforeinstallprompt` não existe no iOS: não havia como a pessoa
 * descobrir a instalação. Como offline, notificação e tela cheia dependem
 * do app instalado, isso deixava o PWA inteiro fora de alcance no iPhone.
 *
 * Aparece uma vez, no topo da tela inicial, e só no celular:
 *  - Android/Chrome: botão que dispara a instalação de verdade;
 *  - iPhone (Safari): o passo a passo, porque não há API.
 *
 * Dispensar guarda a escolha — o convite não vira praga.
 */

const DISMISS_KEY = 'pa7.installPromptDismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setPrompt(null);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const iosSafari = isIosSafari();
  // Só há o que mostrar se o navegador ofereceu a instalação (Android) ou
  // se é o Safari do iPhone, onde o caminho é manual.
  const hasSomethingToShow = Boolean(prompt) || iosSafari;

  if (installed || dismissed || !hasSomethingToShow) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* modo privado: some só nesta sessão, e tudo bem */
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 lg:hidden">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
          <Download size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-800">
            Instale o ProActive7 no celular
          </p>
          <p className="mt-0.5 text-xs text-neutral-600">
            Abre em tela cheia, funciona sem sinal na cozinha e recebe os avisos
            de vencimento.
          </p>

          {prompt ? (
            <button
              type="button"
              onClick={async () => {
                await prompt.prompt();
                const choice = await prompt.userChoice;
                if (choice.outcome === 'accepted') {
                  setPrompt(null);
                } else {
                  // Recusou: não insistir na próxima abertura.
                  dismiss();
                }
              }}
              className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white"
            >
              <Download size={16} />
              Instalar agora
            </button>
          ) : (
            /* iPhone: não existe API de instalação, então o jeito é
               ensinar o caminho — com os nomes exatos dos botões. */
            <ol className="mt-3 flex flex-col gap-2 text-xs text-neutral-700">
              <li className="flex items-center gap-2">
                <Share size={16} className="shrink-0 text-neutral-500" />
                <span>
                  Toque em <strong>Compartilhar</strong>, na barra de baixo do
                  Safari.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <SquarePlus size={16} className="shrink-0 text-neutral-500" />
                <span>
                  Escolha <strong>Adicionar à Tela de Início</strong>.
                </span>
              </li>
            </ol>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar convite de instalação"
          className="-mr-1 -mt-1 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100"
        >
          <X size={16} />
        </button>
      </div>
    </section>
  );
}
