import { describe, it, expect } from 'vitest';
import { isIos, isIosSafari } from './pwa';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';

describe('isIos', () => {
  it('reconhece iPhone', () => expect(isIos(IPHONE_SAFARI)).toBe(true));
  it('não confunde Android', () => expect(isIos(ANDROID_CHROME)).toBe(false));
});

describe('isIosSafari', () => {
  it('Safari do iPhone instala', () =>
    expect(isIosSafari(IPHONE_SAFARI)).toBe(true));

  it('Chrome no iPhone NÃO instala — não mandar a instrução do Safari', () => {
    // O menu "Adicionar à Tela de Início" não existe no Chrome do iOS:
    // mostrar o passo a passo do Safari manda a pessoa procurar um botão
    // que não está lá.
    expect(isIosSafari(IPHONE_CHROME)).toBe(false);
  });

  it('Android não entra na regra do iOS', () =>
    expect(isIosSafari(ANDROID_CHROME)).toBe(false));
});
