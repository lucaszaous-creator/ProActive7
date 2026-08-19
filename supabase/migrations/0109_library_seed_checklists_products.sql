-- =====================================================================
-- 0109_library_seed_checklists_products.sql
--
-- A biblioteca global existe desde a 0052 e ganhou 4 modelos de VISITA na
-- 0060. As outras duas prateleiras nasceram vazias e continuaram vazias:
-- checklist de rotina e catalogo de produtos. Na pratica, nutri nova
-- clicava em "Biblioteca" e nao encontrava nada — o que e pior do que nao
-- ter o botao.
--
-- Esta migration enche as duas.
--
--  1. 5 checklists de ROTINA (o que a cozinha marca no dia a dia).
--  2. Catalogo de produtos comuns com prazo de validade sugerido.
--
-- ⚠️ SOBRE OS PRAZOS: prazo de validade e DECISAO TECNICA da RT
-- (CLAUDE.md §2 — a IA sugere, a nutri assina). Os valores aqui sao o
-- piso conservador das referencias publicas usadas no Brasil (RDC 216/2004
-- para alimentos preparados e a tabela CVS-5/2013, adotada como
-- referencia pela maioria das RTs). Eles existem para a nutri NAO comecar
-- de uma tela em branco — nao para substituir a analise dela. O produto
-- clonado cai na org dela, editavel, e e la que o prazo vira oficial.
--
-- Tudo idempotente (id fixo + on conflict do nothing): rodar de novo nao
-- duplica nem sobrescreve ajuste que o platform_admin tenha feito.
-- =====================================================================

-- ---------- 1. Checklists de rotina globais ----------

insert into public.checklist_templates (id, company_id, name, items, frequency, is_global)
values
(
  '00000000-0000-0000-0000-0000000c0001',
  null,
  'Pré-abertura da cozinha (diário)',
  '[
    {"id":"pa1","text":"Uniformes limpos e completos, cabelos presos, sem adornos"},
    {"id":"pa2","text":"Lavatórios abastecidos: sabonete líquido, antisséptico e papel toalha"},
    {"id":"pa3","text":"Temperatura das câmaras e geladeiras conferida e registrada"},
    {"id":"pa4","text":"Bancadas e utensílios higienizados antes do início"},
    {"id":"pa5","text":"Lixeiras com saco, tampa e acionamento sem contato com a mão"},
    {"id":"pa6","text":"Produtos com validade vencida retirados do estoque"},
    {"id":"pa7","text":"Panos e esponjas do dia trocados"},
    {"id":"pa8","text":"Nenhum sinal de praga (fezes, insetos, roeduras)"}
  ]'::jsonb,
  'daily',
  true
),
(
  '00000000-0000-0000-0000-0000000c0002',
  null,
  'Fechamento da cozinha (diário)',
  '[
    {"id":"fe1","text":"Sobras identificadas, etiquetadas e resfriadas corretamente"},
    {"id":"fe2","text":"Alimentos preparados armazenados cobertos e datados"},
    {"id":"fe3","text":"Bancadas, fogão e coifa higienizados"},
    {"id":"fe4","text":"Piso lavado e área livre de resíduos"},
    {"id":"fe5","text":"Lixo retirado e lixeiras higienizadas"},
    {"id":"fe6","text":"Equipamentos desligados e portas das câmaras fechadas"},
    {"id":"fe7","text":"Temperatura final das câmaras registrada"}
  ]'::jsonb,
  'daily',
  true
),
(
  '00000000-0000-0000-0000-0000000c0003',
  null,
  'Recebimento de mercadorias',
  '[
    {"id":"rc1","text":"Veículo de entrega limpo e sem carga incompatível"},
    {"id":"rc2","text":"Entregador com uniforme e higiene adequados"},
    {"id":"rc3","text":"Temperatura dos refrigerados aferida na chegada (máx. 5 °C)"},
    {"id":"rc4","text":"Temperatura dos congelados aferida na chegada (máx. -12 °C)"},
    {"id":"rc5","text":"Embalagens íntegras, sem amassados, furos ou estufamento"},
    {"id":"rc6","text":"Rótulo com identificação, lote e validade legíveis"},
    {"id":"rc7","text":"Prazo de validade compatível com o uso previsto"},
    {"id":"rc8","text":"Produtos armazenados imediatamente após a conferência"}
  ]'::jsonb,
  'daily',
  true
),
(
  '00000000-0000-0000-0000-0000000c0004',
  null,
  'Higienização semanal (profunda)',
  '[
    {"id":"hs1","text":"Câmaras e geladeiras esvaziadas e higienizadas por dentro"},
    {"id":"hs2","text":"Prateleiras e estrados do estoque limpos"},
    {"id":"hs3","text":"Coifa e filtros desengordurados"},
    {"id":"hs4","text":"Ralos e caixas de gordura limpos"},
    {"id":"hs5","text":"Paredes e rodapés da área de produção lavados"},
    {"id":"hs6","text":"Caixa d''água e filtros verificados (registro de limpeza em dia)"},
    {"id":"hs7","text":"Utensílios de limpeza higienizados e guardados separados dos alimentos"}
  ]'::jsonb,
  'weekly',
  true
),
(
  '00000000-0000-0000-0000-0000000c0005',
  null,
  'Verificação mensal (equipamentos e documentos)',
  '[
    {"id":"vm1","text":"Termômetros aferidos e com registro de calibração"},
    {"id":"vm2","text":"Manutenção preventiva dos equipamentos em dia"},
    {"id":"vm3","text":"Controle de pragas dentro da validade, com certificado arquivado"},
    {"id":"vm4","text":"Potabilidade da água: laudo dentro da validade"},
    {"id":"vm5","text":"ASO de todos os manipuladores válido"},
    {"id":"vm6","text":"Treinamento de boas práticas registrado e atualizado"},
    {"id":"vm7","text":"Manual de Boas Práticas e POPs disponíveis e atualizados"},
    {"id":"vm8","text":"Alvará sanitário dentro da validade"}
  ]'::jsonb,
  'monthly',
  true
)
on conflict (id) do nothing;

-- ---------- 2. Catálogo de produtos (seed) ----------
-- Nomes genericos de proposito: a cozinha da Ariane chama "peito de frango
-- em cubos", a do vizinho chama outra coisa. O que importa e o item existir
-- para a nutri ajustar o nome e o prazo, em vez de digitar do zero.

insert into public.products (id, company_id, name, category, default_storage_condition, is_seed)
values
  ('00000000-0000-0000-0000-0000000d0001', null, 'Carne bovina crua (peça/cubos)', 'Carnes', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0002', null, 'Carne bovina moída', 'Carnes', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0003', null, 'Frango cru (peito/coxa)', 'Carnes', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0004', null, 'Peixe fresco', 'Pescados', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0005', null, 'Carne cozida/assada', 'Preparações', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0006', null, 'Frango cozido/desfiado', 'Preparações', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0007', null, 'Arroz cozido', 'Preparações', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0008', null, 'Feijão cozido', 'Preparações', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0009', null, 'Massa cozida', 'Preparações', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0010', null, 'Molho de tomate caseiro', 'Preparações', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0011', null, 'Sopa/caldo pronto', 'Preparações', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0012', null, 'Legumes higienizados crus', 'Hortifrúti', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0013', null, 'Folhosos higienizados', 'Hortifrúti', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0014', null, 'Legumes cozidos', 'Preparações', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0015', null, 'Fruta higienizada/porcionada', 'Hortifrúti', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0016', null, 'Salada de frutas', 'Preparações', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0017', null, 'Queijo fatiado', 'Laticínios', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0018', null, 'Leite pasteurizado aberto', 'Laticínios', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0019', null, 'Sobremesa láctea preparada', 'Preparações', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0020', null, 'Ovo cozido sem casca', 'Preparações', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0021', null, 'Maionese/molho frio caseiro', 'Preparações', 'refrigerado', true),
  ('00000000-0000-0000-0000-0000000d0022', null, 'Pão/massa crua congelada', 'Panificação', 'congelado', true),
  ('00000000-0000-0000-0000-0000000d0023', null, 'Alimento porcionado congelado', 'Preparações', 'congelado', true),
  ('00000000-0000-0000-0000-0000000d0024', null, 'Produto seco fracionado (grãos, farinhas)', 'Mercearia', 'ambiente', true)
on conflict (id) do nothing;

-- Prazos sugeridos. Refrigerado assume <= 5 °C e congelado <= -18 °C: se a
-- cozinha nao mantem essa faixa, o prazo NAO vale — por isso o modelo de
-- vistoria mede a temperatura.
insert into public.product_shelf_lives (product_id, storage_condition, validity_value, validity_unit)
values
  ('00000000-0000-0000-0000-0000000d0001', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0001', 'congelado', 90, 'days'),
  ('00000000-0000-0000-0000-0000000d0002', 'refrigerado', 2, 'days'),
  ('00000000-0000-0000-0000-0000000d0002', 'congelado', 60, 'days'),
  ('00000000-0000-0000-0000-0000000d0003', 'refrigerado', 2, 'days'),
  ('00000000-0000-0000-0000-0000000d0003', 'congelado', 90, 'days'),
  ('00000000-0000-0000-0000-0000000d0004', 'refrigerado', 1, 'days'),
  ('00000000-0000-0000-0000-0000000d0004', 'congelado', 60, 'days'),
  ('00000000-0000-0000-0000-0000000d0005', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0005', 'congelado', 60, 'days'),
  ('00000000-0000-0000-0000-0000000d0006', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0006', 'congelado', 60, 'days'),
  ('00000000-0000-0000-0000-0000000d0007', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0008', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0009', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0010', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0011', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0012', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0013', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0014', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0015', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0016', 'refrigerado', 1, 'days'),
  ('00000000-0000-0000-0000-0000000d0017', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0018', 'refrigerado', 2, 'days'),
  ('00000000-0000-0000-0000-0000000d0019', 'refrigerado', 3, 'days'),
  ('00000000-0000-0000-0000-0000000d0020', 'refrigerado', 2, 'days'),
  ('00000000-0000-0000-0000-0000000d0021', 'refrigerado', 2, 'days'),
  ('00000000-0000-0000-0000-0000000d0022', 'congelado', 90, 'days'),
  ('00000000-0000-0000-0000-0000000d0023', 'congelado', 90, 'days'),
  ('00000000-0000-0000-0000-0000000d0024', 'ambiente', 30, 'days')
on conflict (product_id, storage_condition) do nothing;
