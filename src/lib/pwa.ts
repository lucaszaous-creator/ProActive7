/**
 * Detecção de ambiente do PWA.
 *
 * Existe porque instalar o app não é uma coisa só: no Android o navegador
 * oferece a instalação por API (`beforeinstallprompt`), e no iOS **não
 * existe API nenhuma** — o caminho é o menu Compartilhar do Safari. Sem
 * tratar os dois, o iPhone simplesmente nunca vê como instalar, e todo o
 * trabalho de offline/notificação fica inalcançável para quem usa iPhone.
 */

/** O app está rodando instalado (fora da aba do navegador)? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    // Safari no iOS não implementa display-mode: usa esta propriedade
    // própria, que só existe lá.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/** iPhone/iPad, incluindo o iPad que se declara "Macintosh" com toque. */
export function isIos(userAgent?: string): boolean {
  const ua =
    userAgent ??
    (typeof navigator === 'undefined' ? '' : navigator.userAgent) ??
    '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ se apresenta como Mac; o toque é o que o separa de um Mac.
  return (
    /Macintosh/.test(ua) &&
    typeof navigator !== 'undefined' &&
    navigator.maxTouchPoints > 1
  );
}

/**
 * No iOS, só o Safari instala. Chrome/Firefox/Edge no iPhone usam o motor
 * do Safari mas NÃO oferecem "Adicionar à Tela de Início" — mandar a
 * instrução do Safari para quem está no Chrome é mandar procurar um botão
 * que não existe.
 */
export function isIosSafari(userAgent?: string): boolean {
  const ua =
    userAgent ??
    (typeof navigator === 'undefined' ? '' : navigator.userAgent) ??
    '';
  if (!isIos(ua)) return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}
