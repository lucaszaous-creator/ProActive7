import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { CompanyFilesSection } from '@/components/CompanyFilesSection';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { PageHeader } from '@/components/ui/PageHeader';

/**
 * Aba "Documentos" — central de arquivos do estabelecimento.
 *
 * A cliente pediu que aqui se CARREGUEM os documentos (upload), em vez
 * de editá-los como texto. Por isso a página inteira agora é o
 * CompanyFilesSection, com categorias (Manual de Boas Práticas, POPs,
 * ASO, controle de pragas, alvarás, outros). O antigo editor markdown
 * (tabela `documents`) foi aposentado da UI — os dados antigos seguem
 * preservados no banco, mas o fluxo de criação/edição agora é upload.
 */
export function DocumentsPage() {
  usePageTitle('Documentos');
  const { isMaster } = useAuth();
  const { companies, companyId, setCompanyId } = useCompanyScope();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Documentos"
        subtitle="Carregue e organize os documentos de cada estabelecimento — Manual de Boas Práticas, POPs (RDC 216 + RDC 275), ASO, laudos de controle de pragas e alvarás."
      />

      {isMaster && companies.length > 0 ? (
        <div className="mb-4">
          <Select
            id="company-scope"
            label="Empresa"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {companyId ? (
        <CompanyFilesSection companyId={companyId} />
      ) : (
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {isMaster && companies.length === 0
              ? 'Nenhuma empresa cadastrada. Crie uma empresa para começar.'
              : 'Selecione uma empresa para gerenciar seus documentos.'}
          </p>
        </Card>
      )}
    </div>
  );
}
