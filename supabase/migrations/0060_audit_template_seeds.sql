-- =====================================================================
-- 0060_audit_template_seeds.sql
-- Seed de 4 modelos de visita técnica globais baseados em ANVISA:
--   1. Roteiro RDC 216/2004 — Boas Práticas (completo, ~45 itens)
--   2. Visita mensal rápida — itens críticos (~15)
--   3. Checklist de pré-abertura diária (~10)
--   4. Auditoria diagnóstica inicial (~30, primeira visita)
--
-- Todos com is_global=true e company_id=null. RLS permite leitura para
-- toda a base e clonagem via /platform/biblioteca.
-- =====================================================================

insert into public.audit_templates (id, company_id, name, items, is_global)
values
(
  '00000000-0000-0000-0000-000000000216',
  null,
  'Roteiro RDC 216/2004 — Boas Práticas (completo)',
  '[
    {"id":"e1","category":"Edificação","text":"Pisos, paredes e tetos em bom estado, sem trincas, infiltrações ou bolores","weight":2,"legal_ref":"RDC 216 4.1.1"},
    {"id":"e2","category":"Edificação","text":"Portas e janelas com vedação adequada e telas milimétricas","weight":2,"legal_ref":"RDC 216 4.1.4"},
    {"id":"e3","category":"Edificação","text":"Iluminação adequada e luminárias protegidas contra estilhaços","weight":1,"legal_ref":"RDC 216 4.1.10"},
    {"id":"e4","category":"Edificação","text":"Ventilação garante conforto térmico e renovação do ar","weight":2,"legal_ref":"RDC 216 4.1.11"},
    {"id":"e5","category":"Edificação","text":"Lavatórios exclusivos para higiene das mãos providos de sabonete, antisséptico e toalha descartável","weight":3,"legal_ref":"RDC 216 4.1.13"},
    {"id":"e6","category":"Edificação","text":"Áreas externas livres de objetos em desuso e focos de insalubridade","weight":1,"legal_ref":"RDC 216 4.1.2"},
    {"id":"eq1","category":"Equipamentos","text":"Equipamentos em bom estado de conservação e funcionamento","weight":2,"legal_ref":"RDC 216 4.2.1"},
    {"id":"eq2","category":"Equipamentos","text":"Superfícies de contato com alimentos lisas, íntegras, atóxicas e impermeáveis","weight":3,"legal_ref":"RDC 216 4.2.2"},
    {"id":"eq3","category":"Equipamentos","text":"Termômetros calibrados e em uso (refrigerador, freezer, estufa)","weight":3,"legal_ref":"RDC 216 4.2.5"},
    {"id":"eq4","category":"Equipamentos","text":"Plano de manutenção preventiva documentado","weight":2,"legal_ref":"RDC 216 4.2.3"},
    {"id":"m1","category":"Manipuladores","text":"Uniformes limpos, completos e exclusivos da área de produção","weight":2,"legal_ref":"RDC 216 4.6.4"},
    {"id":"m2","category":"Manipuladores","text":"Mãos lavadas corretamente nos momentos previstos","weight":3,"legal_ref":"RDC 216 4.6.6"},
    {"id":"m3","category":"Manipuladores","text":"Cabelos presos com touca, barba feita, sem adornos","weight":2,"legal_ref":"RDC 216 4.6.3"},
    {"id":"m4","category":"Manipuladores","text":"Manipuladores sem feridas ou doenças que comprometam a segurança","weight":3,"legal_ref":"RDC 216 4.6.7"},
    {"id":"m5","category":"Manipuladores","text":"Capacitação em boas práticas comprovada (registros)","weight":2,"legal_ref":"RDC 216 4.6.9"},
    {"id":"m6","category":"Manipuladores","text":"ASO (Atestado de Saúde Ocupacional) atualizado","weight":3,"legal_ref":"RDC 216 4.6.7"},
    {"id":"mp1","category":"Matérias-primas","text":"Recebimento conferindo temperatura, validade e integridade","weight":3,"legal_ref":"RDC 216 4.7.1"},
    {"id":"mp2","category":"Matérias-primas","text":"Insumos armazenados em estrados, distantes do piso e paredes","weight":2,"legal_ref":"RDC 216 4.7.4"},
    {"id":"mp3","category":"Matérias-primas","text":"Rotulagem com identificação, data de recebimento e validade","weight":2,"legal_ref":"RDC 216 4.7.3"},
    {"id":"mp4","category":"Matérias-primas","text":"Sistema PEPS/FIFO em uso","weight":2,"legal_ref":"RDC 216 4.7.5"},
    {"id":"h1","category":"Higienização","text":"Cronograma de higienização de instalações documentado e executado","weight":3,"legal_ref":"RDC 216 4.3.1"},
    {"id":"h2","category":"Higienização","text":"Produtos saneantes regularizados na ANVISA","weight":2,"legal_ref":"RDC 216 4.3.6"},
    {"id":"h3","category":"Higienização","text":"Diluição e tempo de contato dos saneantes corretos","weight":3,"legal_ref":"RDC 216 4.3.5"},
    {"id":"h4","category":"Higienização","text":"Utensílios de limpeza identificados por área e armazenados separadamente","weight":1,"legal_ref":"RDC 216 4.3.8"},
    {"id":"p1","category":"Pragas","text":"Controle integrado de pragas com empresa licenciada","weight":3,"legal_ref":"RDC 216 4.4.1"},
    {"id":"p2","category":"Pragas","text":"Comprovantes e mapa de iscas disponíveis","weight":2,"legal_ref":"RDC 216 4.4.2"},
    {"id":"p3","category":"Pragas","text":"Ausência de evidências de pragas (fezes, ninhos, insetos)","weight":3,"legal_ref":"RDC 216 4.4.1"},
    {"id":"a1","category":"Água","text":"Caixa dágua higienizada nos últimos 6 meses","weight":3,"legal_ref":"RDC 216 4.5.2"},
    {"id":"a2","category":"Água","text":"Laudo de potabilidade anual disponível","weight":3,"legal_ref":"RDC 216 4.5.1"},
    {"id":"a3","category":"Água","text":"Verificação do cloro residual livre realizada e registrada","weight":2,"legal_ref":"RDC 216 4.5.1"},
    {"id":"r1","category":"Resíduos","text":"Lixeiras com tampa, pedal e sacos plásticos em todas as áreas","weight":2,"legal_ref":"RDC 216 4.8.1"},
    {"id":"r2","category":"Resíduos","text":"Coleta interna frequente; área externa fechada e separada das áreas de preparo","weight":2,"legal_ref":"RDC 216 4.8.2"},
    {"id":"r3","category":"Resíduos","text":"Óleo usado armazenado separadamente; coletor licenciado","weight":1,"legal_ref":"RDC 216 4.8.3"},
    {"id":"prep1","category":"Preparação","text":"Descongelamento sob refrigeração (≤ 4 °C) ou microondas","weight":3,"legal_ref":"RDC 216 4.9.4"},
    {"id":"prep2","category":"Preparação","text":"Cocção com temperatura interna ≥ 70 °C verificada","weight":3,"legal_ref":"RDC 216 4.9.6"},
    {"id":"prep3","category":"Preparação","text":"Resfriamento de 60 a 10 °C em até 2 horas","weight":3,"legal_ref":"RDC 216 4.9.10"},
    {"id":"prep4","category":"Preparação","text":"Higienização de hortifrutis com solução clorada 200 ppm por 15 min","weight":3,"legal_ref":"RDC 216 4.9.5"},
    {"id":"prep5","category":"Preparação","text":"Etiquetas de validade em todos os produtos manipulados","weight":3,"legal_ref":"RDC 216 4.11.3"},
    {"id":"dist1","category":"Distribuição","text":"Alimentos quentes mantidos acima de 60 °C ou abaixo de 5 °C","weight":3,"legal_ref":"RDC 216 4.11.4"},
    {"id":"dist2","category":"Distribuição","text":"Tempo de exposição em buffet controlado e registrado","weight":2,"legal_ref":"RDC 216 4.11.6"},
    {"id":"dist3","category":"Distribuição","text":"Utensílios de serviço separados por tipo de alimento","weight":1,"legal_ref":"RDC 216 4.11.5"},
    {"id":"doc1","category":"Documentação","text":"Manual de Boas Práticas atualizado e acessível","weight":3,"legal_ref":"RDC 216 4.11.1"},
    {"id":"doc2","category":"Documentação","text":"POPs (higienização, água, manipuladores, resíduos, manutenção) implementados","weight":3,"legal_ref":"RDC 275/2002"},
    {"id":"doc3","category":"Documentação","text":"Registros de temperatura mantidos por pelo menos 30 dias","weight":2,"legal_ref":"RDC 216 4.11.2"},
    {"id":"doc4","category":"Documentação","text":"Alvará sanitário atualizado e visível","weight":3,"legal_ref":""},
    {"id":"doc5","category":"Documentação","text":"Responsável técnico (nutricionista) com registro no CRN ativo","weight":3,"legal_ref":""}
  ]'::jsonb,
  true
),
(
  '00000000-0000-0000-0000-000000000300',
  null,
  'Visita mensal rápida — itens críticos',
  '[
    {"id":"v1","category":"Manipuladores","text":"ASOs em dia e treinamentos vigentes","weight":3,"legal_ref":"RDC 216 4.6.7"},
    {"id":"v2","category":"Manipuladores","text":"Higiene pessoal e uniformes adequados na visita","weight":3,"legal_ref":"RDC 216 4.6"},
    {"id":"v3","category":"Edificação","text":"Lavatórios exclusivos com sabonete, antisséptico e papel toalha","weight":3,"legal_ref":"RDC 216 4.1.13"},
    {"id":"v4","category":"Equipamentos","text":"Temperaturas de freezer, geladeira e estufa dentro da faixa","weight":3,"legal_ref":"RDC 216 4.2.5"},
    {"id":"v5","category":"Matérias-primas","text":"Estoque com PEPS/FIFO; ausência de produtos vencidos","weight":3,"legal_ref":"RDC 216 4.7.5"},
    {"id":"v6","category":"Matérias-primas","text":"Todas as etiquetas de validade legíveis e dentro do prazo","weight":3,"legal_ref":"RDC 216 4.11.3"},
    {"id":"v7","category":"Higienização","text":"Saneantes regularizados; diluição correta; utensílios identificados","weight":2,"legal_ref":"RDC 216 4.3"},
    {"id":"v8","category":"Preparação","text":"Cocção com termômetro ≥ 70 °C verificada em pelo menos 1 preparo","weight":3,"legal_ref":"RDC 216 4.9.6"},
    {"id":"v9","category":"Preparação","text":"Higienização de hortifrutis 200 ppm por 15 min em uso","weight":3,"legal_ref":"RDC 216 4.9.5"},
    {"id":"v10","category":"Distribuição","text":"Alimentos prontos a > 60 °C ou < 5 °C; tempo de buffet controlado","weight":3,"legal_ref":"RDC 216 4.11.4"},
    {"id":"v11","category":"Pragas","text":"Sem evidências de pragas; última visita PCMIP em prazo","weight":3,"legal_ref":"RDC 216 4.4"},
    {"id":"v12","category":"Água","text":"Cloro residual livre dentro do parâmetro; caixa dágua na validade","weight":2,"legal_ref":"RDC 216 4.5"},
    {"id":"v13","category":"Documentação","text":"Planilhas de temperatura, higienização e cocção atualizadas","weight":2,"legal_ref":"RDC 216 4.11.2"},
    {"id":"v14","category":"Documentação","text":"NCs da visita anterior endereçadas (plano de ação concluído)","weight":3,"legal_ref":""},
    {"id":"v15","category":"Resíduos","text":"Lixeiras tampadas com pedal; coleta externa separada","weight":1,"legal_ref":"RDC 216 4.8.1"}
  ]'::jsonb,
  true
),
(
  '00000000-0000-0000-0000-000000000400',
  null,
  'Checklist de pré-abertura (diário)',
  '[
    {"id":"pa1","category":"Equipamentos","text":"Temperatura de geladeira e freezer registrada dentro da faixa","weight":3,"legal_ref":"RDC 216 4.2.5"},
    {"id":"pa2","category":"Equipamentos","text":"Estufas e banho-maria pré-aquecidos ≥ 60 °C","weight":3,"legal_ref":"RDC 216 4.11.4"},
    {"id":"pa3","category":"Manipuladores","text":"Equipe uniformizada e com touca antes de entrar na produção","weight":2,"legal_ref":"RDC 216 4.6.3"},
    {"id":"pa4","category":"Manipuladores","text":"Sem ferimentos expostos ou sintomas gripais","weight":3,"legal_ref":"RDC 216 4.6.7"},
    {"id":"pa5","category":"Higienização","text":"Bancadas, utensílios e equipamentos higienizados antes do uso","weight":3,"legal_ref":"RDC 216 4.3"},
    {"id":"pa6","category":"Higienização","text":"Lavatórios com sabonete, antisséptico e papel toalha disponíveis","weight":3,"legal_ref":"RDC 216 4.1.13"},
    {"id":"pa7","category":"Matérias-primas","text":"Conferência das etiquetas vivas — descartar vencidos antes de servir","weight":3,"legal_ref":"RDC 216 4.11.3"},
    {"id":"pa8","category":"Matérias-primas","text":"Insumos do dia retirados conforme PEPS, sem misturar lotes","weight":2,"legal_ref":"RDC 216 4.7.5"},
    {"id":"pa9","category":"Pragas","text":"Inspeção visual rápida — sem evidências de insetos ou roedores","weight":2,"legal_ref":"RDC 216 4.4"},
    {"id":"pa10","category":"Preparação","text":"Termômetros e cronômetros disponíveis nos postos de cocção","weight":2,"legal_ref":"RDC 216 4.9.6"}
  ]'::jsonb,
  true
),
(
  '00000000-0000-0000-0000-000000000500',
  null,
  'Auditoria diagnóstica inicial (primeira visita)',
  '[
    {"id":"d1","category":"Documentação","text":"Alvará sanitário vigente e visível","weight":3,"legal_ref":""},
    {"id":"d2","category":"Documentação","text":"Manual de Boas Práticas e POPs implementados e acessíveis","weight":3,"legal_ref":"RDC 216 4.11.1"},
    {"id":"d3","category":"Documentação","text":"Histórico de capacitação dos manipuladores arquivado","weight":2,"legal_ref":"RDC 216 4.6.9"},
    {"id":"d4","category":"Documentação","text":"Laudo de potabilidade anual da água arquivado","weight":3,"legal_ref":"RDC 216 4.5.1"},
    {"id":"d5","category":"Documentação","text":"Contrato com empresa de PCMIP vigente","weight":3,"legal_ref":"RDC 216 4.4.1"},
    {"id":"d6","category":"Documentação","text":"Comprovante de higienização semestral da caixa dágua","weight":3,"legal_ref":"RDC 216 4.5.2"},
    {"id":"d7","category":"Documentação","text":"Plano de manutenção preventiva de equipamentos","weight":2,"legal_ref":"RDC 216 4.2.3"},
    {"id":"d8","category":"Edificação","text":"Layout permite fluxo unidirecional (sujo → limpo)","weight":2,"legal_ref":"RDC 216 4.1"},
    {"id":"d9","category":"Edificação","text":"Pisos, paredes e tetos íntegros e laváveis","weight":2,"legal_ref":"RDC 216 4.1.1"},
    {"id":"d10","category":"Edificação","text":"Aberturas protegidas com telas milimétricas","weight":3,"legal_ref":"RDC 216 4.1.4"},
    {"id":"d11","category":"Edificação","text":"Iluminação com luminárias protegidas; sem riscos de queda","weight":1,"legal_ref":"RDC 216 4.1.10"},
    {"id":"d12","category":"Equipamentos","text":"Equipamentos calibrados; termômetros funcionais","weight":3,"legal_ref":"RDC 216 4.2.5"},
    {"id":"d13","category":"Equipamentos","text":"Materiais em contato com alimento são atóxicos e laváveis","weight":3,"legal_ref":"RDC 216 4.2.2"},
    {"id":"d14","category":"Manipuladores","text":"Todos os colaboradores com ASO inicial / atualizado","weight":3,"legal_ref":"RDC 216 4.6.7"},
    {"id":"d15","category":"Manipuladores","text":"Treinamento inicial de Boas Práticas registrado","weight":3,"legal_ref":"RDC 216 4.6.9"},
    {"id":"d16","category":"Manipuladores","text":"Uniformes e EPIs adequados à atividade","weight":2,"legal_ref":"RDC 216 4.6.4"},
    {"id":"d17","category":"Matérias-primas","text":"Fornecedores avaliados e cadastrados","weight":2,"legal_ref":"RDC 216 4.7.1"},
    {"id":"d18","category":"Matérias-primas","text":"Procedimento de recebimento documentado (temperatura, integridade)","weight":3,"legal_ref":"RDC 216 4.7.1"},
    {"id":"d19","category":"Matérias-primas","text":"Estoque organizado por categoria, sem produtos vencidos","weight":3,"legal_ref":"RDC 216 4.7"},
    {"id":"d20","category":"Higienização","text":"Saneantes regularizados na ANVISA; FISPQ disponível","weight":3,"legal_ref":"RDC 216 4.3.6"},
    {"id":"d21","category":"Higienização","text":"Cronograma de higienização afixado","weight":2,"legal_ref":"RDC 216 4.3.1"},
    {"id":"d22","category":"Pragas","text":"Mapa de iscas atualizado; certificados de aplicação disponíveis","weight":3,"legal_ref":"RDC 216 4.4.2"},
    {"id":"d23","category":"Pragas","text":"Sem evidências de infestação no ato da visita","weight":3,"legal_ref":"RDC 216 4.4.1"},
    {"id":"d24","category":"Água","text":"Cloro residual livre 0,2–2,0 ppm (medido na visita)","weight":2,"legal_ref":"RDC 216 4.5.1"},
    {"id":"d25","category":"Resíduos","text":"Lixeiras adequadas; coleta diferenciada de orgânico/reciclável","weight":2,"legal_ref":"RDC 216 4.8.1"},
    {"id":"d26","category":"Resíduos","text":"Destino correto do óleo usado","weight":1,"legal_ref":"RDC 216 4.8.3"},
    {"id":"d27","category":"Preparação","text":"Procedimentos de descongelamento, cocção e resfriamento conformes","weight":3,"legal_ref":"RDC 216 4.9"},
    {"id":"d28","category":"Preparação","text":"Sistema de etiquetagem de produtos manipulados em uso","weight":3,"legal_ref":"RDC 216 4.11.3"},
    {"id":"d29","category":"Distribuição","text":"Controle de tempo e temperatura na distribuição","weight":3,"legal_ref":"RDC 216 4.11.4"},
    {"id":"d30","category":"Distribuição","text":"Amostras de alimentos preparados guardadas por 72h (se aplicável)","weight":2,"legal_ref":"RDC 216 4.11.7"}
  ]'::jsonb,
  true
)
on conflict (id) do update
  set name = excluded.name,
      items = excluded.items,
      is_global = excluded.is_global,
      company_id = excluded.company_id;
