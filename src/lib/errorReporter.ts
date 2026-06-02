// Ponte para o Sentry sem acoplamento estático: o main.tsx registra o
// reporter assim que o SDK carrega (produção), e a RootErrorBoundary o usa.

type ErrorReporter = (error: unknown) => void;
let reporter: ErrorReporter | null = null;

export function setErrorReporter(fn: ErrorReporter): void {
  reporter = fn;
}

export function reportError(error: unknown): void {
  reporter?.(error);
}
