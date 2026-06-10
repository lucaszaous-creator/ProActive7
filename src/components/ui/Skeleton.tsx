/**
 * Skeletons mono — placeholders com onda de luz (`.fx-skeleton`) para
 * carregamento de listas/tabelas. Percepção de velocidade muito melhor
 * que um spinner centralizado. Custo zero, sem dependências.
 */

/** Bloco genérico. Passe largura/altura via className (ex.: "h-4 w-32"). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`fx-skeleton block rounded-md ${className}`} />;
}

/** Linha de cartão — ícone + duas linhas de texto. Imita um item de lista. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-8 w-16 shrink-0 rounded-lg" />
    </div>
  );
}

/** Lista de N linhas-esqueleto — substitui o `<Spinner>` no carregamento. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
