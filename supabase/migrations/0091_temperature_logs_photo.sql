-- =====================================================================
-- 0091_temperature_logs_photo.sql
--
-- Permite anexar uma foto a cada registro de temperatura — pedido da
-- cliente: "Registro de temperatura também precisa fazer upload de
-- foto". Reusa o bucket/tabela `photos` (cleanup de 30 dias já cobre).
-- =====================================================================

alter table public.temperature_logs
  add column if not exists photo_id uuid
  references public.photos(id)
  on delete set null;
