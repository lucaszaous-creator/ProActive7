import type { DocumentType } from './types';

export interface PopTemplate {
  type: DocumentType;
  title: string;
  /** Referencia normativa principal. */
  legalRef: string;
  /** Conteudo inicial em markdown. */
  content: string;
}

const HEADER = (title: string, ref: string) =>
  `# ${title}\n\n` +
  `**Base legal:** ${ref}\n\n` +
  `**Empresa:** {{empresa}}\n` +
  `**Responsavel Tecnico:** {{rt_nome}} - CRN {{rt_crn}}\n` +
  `**Data de elaboracao:** {{data}}\n\n` +
  `---\n\n`;

export const POP_TEMPLATES: PopTemplate[] = [
  {
    type: 'mbp',
    title: 'Manual de Boas Praticas',
    legalRef: 'RDC ANVISA 216/2004',
    content:
      HEADER('Manual de Boas Praticas', 'RDC ANVISA 216/2004') +
      `## 1. Identificacao do Estabelecimento\n\n` +
      `- Razao social, CNPJ, endereco completo, telefone.\n` +
      `- Atividade principal (restaurante, lanchonete, padaria, comissaria).\n` +
      `- Numero de refeicoes/dia atendidas.\n\n` +
      `## 2. Responsabilidade Tecnica\n\n` +
      `Nutricionista responsavel tecnica, registrada no CRN, com atribuicoes:\n` +
      `- Elaboracao do MBP e POPs.\n` +
      `- Capacitacao continuada da equipe de manipuladores.\n` +
      `- Supervisao da producao e dos registros sanitarios.\n\n` +
      `## 3. Edificacao, Instalacoes e Saneantes\n\n` +
      `- Layout funcional separando area suja, semi-limpa e limpa.\n` +
      `- Pisos, paredes e tetos lavaveis, sem fissuras.\n` +
      `- Iluminacao protegida; ventilacao adequada; combate a vetores.\n\n` +
      `## 4. Equipamentos, Moveis e Utensilios\n\n` +
      `- Materiais atoxicos; manutencao preventiva por cronograma.\n` +
      `- Termometros calibrados semestralmente.\n\n` +
      `## 5. Manipuladores\n\n` +
      `- Higiene pessoal, uniformes, treinamentos periodicos.\n` +
      `- Atestados de saude ocupacional anuais.\n\n` +
      `## 6. Materias-Primas e Embalagens\n\n` +
      `- Recebimento conforme criterios (temperatura, validade, rotulagem).\n` +
      `- Armazenamento por categoria, em FIFO.\n\n` +
      `## 7. Preparacao do Alimento\n\n` +
      `- Higienizacao de hortifrutis com cloracao 200 ppm por 15 min.\n` +
      `- Coccao com temperatura interna >= 70 C.\n` +
      `- Resfriamento de 60 C a 10 C em ate 2 horas.\n\n` +
      `## 8. Distribuicao e Transporte\n\n` +
      `- Alimentos quentes acima de 60 C; frios abaixo de 5 C.\n` +
      `- Transporte com isotermia controlada e laudo.\n\n` +
      `## 9. Documentacao e Registro\n\n` +
      `- POPs assinados pela RT; planilhas de temperatura e checklists.\n` +
      `- Manter registros por 30 dias minimo.\n\n` +
      `## 10. Plano de Acao Corretivo\n\n` +
      `- Identificacao da nao-conformidade.\n` +
      `- Acao imediata, prazo e responsavel.\n` +
      `- Verificacao da eficacia.\n`,
  },
  {
    type: 'pop_higienizacao',
    title: 'POP - Higienizacao de Instalacoes, Equipamentos, Moveis e Utensilios',
    legalRef: 'RDC ANVISA 275/2002 - item 1',
    content:
      HEADER(
        'POP - Higienizacao',
        'RDC ANVISA 275/2002 - item 1',
      ) +
      `## Objetivo\n\nGarantir higiene em areas, equipamentos e utensilios para prevenir contaminacao cruzada.\n\n` +
      `## Frequencia\n\n- Diaria: bancadas, fogoes, pias, pisos.\n- Semanal: refrigeradores, freezers, exaustores.\n- Mensal: paredes, tetos, ralos profundos.\n\n` +
      `## Procedimento\n\n1. Pre-lavagem com agua morna.\n2. Aplicacao de detergente neutro com esponja apropriada.\n3. Enxague com agua potavel.\n4. Sanitizacao com hipoclorito de sodio 200 ppm (10 mL p/ 1 L), tempo de contato 15 min.\n5. Enxague final e secagem.\n\n` +
      `## Produtos Utilizados\n\n- Detergente neutro registrado no ANVISA.\n- Hipoclorito de sodio 2%.\n- Alcool 70 INPM para superficies pos-higienizacao.\n\n` +
      `## Responsabilidades\n\n- Manipuladores: execucao conforme cronograma.\n- Encarregado: verificacao diaria.\n- RT: auditoria mensal.\n\n` +
      `## Registro\n\n- Planilha "Cronograma de Higienizacao" assinada apos cada limpeza.\n`,
  },
  {
    type: 'pop_agua',
    title: 'POP - Controle da Potabilidade da Agua',
    legalRef: 'RDC ANVISA 275/2002 - item 2 + Portaria GM/MS 888/2021',
    content:
      HEADER(
        'POP - Potabilidade da Agua',
        'RDC ANVISA 275/2002 - item 2 + Portaria GM/MS 888/2021',
      ) +
      `## Objetivo\n\nAssegurar que a agua utilizada no estabelecimento atenda aos padroes de potabilidade.\n\n` +
      `## Fonte de Abastecimento\n\n- Rede publica / poco artesiano (descrever).\n- Caixa d agua: capacidade ___ L; material ___.\n\n` +
      `## Procedimento\n\n1. Limpeza semestral da caixa d agua por empresa especializada.\n2. Apresentacao do certificado de limpeza apos cada servico.\n3. Analise laboratorial anual (coliformes totais, cloro residual livre).\n4. Verificacao diaria do cloro residual com kit colorimetrico (faixa 0,2-2 mg/L).\n\n` +
      `## Responsabilidades\n\n- Encarregado: registro diario do cloro residual.\n- RT: avaliacao dos laudos.\n\n` +
      `## Registro\n\n- Certificado de limpeza da caixa d agua.\n- Laudo de potabilidade anual.\n- Planilha diaria de cloro residual.\n`,
  },
  {
    type: 'pop_manipuladores',
    title: 'POP - Higiene e Saude dos Manipuladores',
    legalRef: 'RDC ANVISA 275/2002 - item 3 + RDC 216/2004 art. 4.6',
    content:
      HEADER(
        'POP - Manipuladores',
        'RDC ANVISA 275/2002 - item 3 + RDC 216/2004 art. 4.6',
      ) +
      `## Higiene Pessoal\n\n- Banho diario; cabelos presos; sem adornos; unhas curtas, limpas e sem esmalte.\n- Uniforme completo e limpo: jaleco, calca, sapato fechado, toca, mascara, EPI especifico.\n\n` +
      `## Lavagem de Maos\n\n- Antes de iniciar o trabalho, apos uso do sanitario, apos manipulacao de alimentos crus, apos contato com superficies contaminadas.\n- Procedimento: molhar maos, sabonete antisseptico, friccionar 20 s, enxague, secagem em papel toalha.\n\n` +
      `## Saude\n\n- Atestado de Saude Ocupacional (ASO) anual obrigatorio.\n- Afastamento imediato em caso de gripe, diarreia, infeccoes de pele ou similares.\n- Notificar a chefia ao primeiro sintoma.\n\n` +
      `## Capacitacao\n\n- Treinamento inicial de boas praticas no primeiro dia.\n- Reciclagem minima anual.\n- Registro com lista de presenca assinada.\n\n` +
      `## Registro\n\n- Pasta individual por manipulador com ASO, treinamentos, advertencias.\n`,
  },
  {
    type: 'pop_residuos',
    title: 'POP - Manejo dos Residuos',
    legalRef: 'RDC ANVISA 275/2002 - item 4',
    content:
      HEADER(
        'POP - Residuos',
        'RDC ANVISA 275/2002 - item 4',
      ) +
      `## Objetivo\n\nGarantir armazenamento e descarte adequados dos residuos solidos e organicos.\n\n` +
      `## Procedimento\n\n1. Lixeiras com tampa, pedal e saco plastico em todas as areas.\n2. Retirada minima a cada 4 horas, ou ao atingir 3/4 da capacidade.\n3. Acondicionamento externo em area fechada, distante das areas de preparo.\n4. Coleta municipal conforme cronograma; oleo de cozinha entregue a coletor licenciado.\n\n` +
      `## Higienizacao das Lixeiras\n\n- Lavagem diaria com detergente.\n- Sanitizacao semanal com hipoclorito 200 ppm.\n\n` +
      `## Registro\n\n- Comprovantes de coleta de oleo e residuos organicos.\n- Planilha de higienizacao de lixeiras.\n`,
  },
  {
    type: 'pop_manutencao',
    title: 'POP - Manutencao Preventiva e Calibracao de Equipamentos',
    legalRef: 'RDC ANVISA 275/2002 - item 5',
    content:
      HEADER(
        'POP - Manutencao e Calibracao',
        'RDC ANVISA 275/2002 - item 5',
      ) +
      `## Objetivo\n\nManter equipamentos em condicoes adequadas de uso e termometros aferidos.\n\n` +
      `## Manutencao Preventiva\n\n- Geladeiras, freezers, fogoes e fritadeiras: revisao trimestral por empresa especializada.\n- Coifas e exaustores: limpeza profissional semestral.\n- Apresentacao de laudo apos cada manutencao.\n\n` +
      `## Calibracao de Termometros\n\n- Calibracao semestral por laboratorio acreditado.\n- Termometros internos verificados semanalmente em banho de gelo (deve marcar 0 +/- 1 C).\n- Substituicao imediata em caso de desvio > 2 C.\n\n` +
      `## Responsabilidades\n\n- Gerente operacional: agenda das manutencoes.\n- RT: validacao dos laudos.\n\n` +
      `## Registro\n\n- Plano anual de manutencao.\n- Laudos de manutencao e calibracao.\n`,
  },
];

export function getPopTemplate(type: DocumentType): PopTemplate | undefined {
  return POP_TEMPLATES.find((p) => p.type === type);
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  mbp: 'Manual de Boas Praticas',
  pop_higienizacao: 'POP - Higienizacao',
  pop_agua: 'POP - Potabilidade da Agua',
  pop_manipuladores: 'POP - Manipuladores',
  pop_residuos: 'POP - Residuos',
  pop_manutencao: 'POP - Manutencao e Calibracao',
};
