import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

/**
 * Primitivas de tabela do design system. Encapsulam o padrão repetido
 * nas páginas (wrapper com scroll horizontal, header uppercase, linhas
 * com divisor suave) garantindo dark mode consistente.
 *
 * Uso:
 *   <Table>
 *     <thead><tr><Th>Produto</Th>...</tr></thead>
 *     <tbody><Tr><Td>...</Td></Tr></tbody>
 *   </Table>
 */
export function Table({
  className = '',
  children,
  ...rest
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full text-sm ${className}`} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  className = '',
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`border-b border-neutral-200 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 first:pl-0 last:pr-0 ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Tr({
  className = '',
  children,
  ...rest
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-50/70 ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function Td({
  className = '',
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`px-3 py-2.5 text-neutral-700 first:pl-0 last:pr-0 ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}
