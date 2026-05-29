import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Thermometer, AlertTriangle } from 'lucide-react';
import { logFeatureEvent } from '@/lib/platformMetrics';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import {
  EQUIPMENT_TYPE_LABELS,
  type Equipment,
  type EquipmentType,
  type TemperatureLog,
} from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';

const TYPES: EquipmentType[] = ['freezer', 'geladeira', 'estufa'];

const DEFAULTS: Record<EquipmentType, { min: number; max: number }> = {
  freezer: { min: -22, max: -15 },
  geladeira: { min: 0, max: 8 },
  estufa: { min: 60, max: 90 },
};

interface LogWithEquip extends TemperatureLog {
  equipment: { name: string; temp_min: number; temp_max: number } | null;
}

export function TemperaturePage() {
  usePageTitle('Temperatura');
  const { profile } = useAuth();
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [logs, setLogs] = useState<LogWithEquip[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario de equipamento
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<EquipmentType>('geladeira');
  const [tempMin, setTempMin] = useState('0');
  const [tempMax, setTempMax] = useState('8');
  const [equipActive, setEquipActive] = useState(true);

  // Registro de leitura
  const [selectedEquip, setSelectedEquip] = useState('');
  const [temperature, setTemperature] = useState('');
  const [notes, setNotes] = useState('');
  const [recording, setRecording] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setEquipment([]);
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [eqRes, logRes] = await Promise.all([
      supabase
        .from('equipment')
        .select('*')
        .eq('company_id', companyId)
        .order('name'),
      supabase
        .from('temperature_logs')
        .select('*, equipment(name, temp_min, temp_max, company_id)')
        .order('recorded_at', { ascending: false })
        .limit(20),
    ]);
    setLoading(false);
    if (eqRes.error) {
      toast.error('Erro ao carregar equipamentos: ' + eqRes.error.message);
      return;
    }
    setEquipment((eqRes.data as Equipment[] | null) ?? []);
    const rawLogs = (logRes.data as LogWithEquip[] | null) ?? [];
    // Filtra ao escopo da empresa (RLS ja garante isso, mas para o master
    // que ve tudo, filtramos pelo company_id selecionado).
    setLogs(
      rawLogs.filter((l) =>
        eqRes.data?.some((e: Equipment) => e.id === l.equipment_id),
      ),
    );
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setType('geladeira');
    setTempMin(String(DEFAULTS.geladeira.min));
    setTempMax(String(DEFAULTS.geladeira.max));
    setEquipActive(true);
    setModalOpen(true);
  }

  function openEdit(e: Equipment) {
    setEditing(e);
    setName(e.name);
    setType(e.type);
    setTempMin(String(e.temp_min));
    setTempMax(String(e.temp_max));
    setEquipActive(e.active);
    setModalOpen(true);
  }

  function handleTypeChange(t: EquipmentType) {
    setType(t);
    if (!editing) {
      setTempMin(String(DEFAULTS[t].min));
      setTempMax(String(DEFAULTS[t].max));
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Informe o nome do equipamento.');
      return;
    }
    const min = Number(tempMin);
    const max = Number(tempMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      toast.error('Temperaturas devem ser números.');
      return;
    }
    if (max < min) {
      toast.error('Temperatura máxima não pode ser menor que a mínima.');
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      type,
      temp_min: min,
      temp_max: max,
      active: equipActive,
    };
    const { error } = editing
      ? await supabase.from('equipment').update(payload).eq('id', editing.id)
      : await supabase
          .from('equipment')
          .insert({ ...payload, company_id: companyId });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'Equipamento atualizado.' : 'Equipamento criado.');
    setModalOpen(false);
    void load();
  }

  async function handleRecord() {
    if (!selectedEquip) {
      toast.error('Selecione um equipamento.');
      return;
    }
    const temp = Number(temperature);
    if (!Number.isFinite(temp)) {
      toast.error('Informe uma temperatura válida.');
      return;
    }
    setRecording(true);
    const { error } = await supabase.from('temperature_logs').insert({
      equipment_id: selectedEquip,
      temperature: temp,
      notes: notes.trim() || null,
      recorded_by: profile?.id ?? null,
    });
    setRecording(false);
    if (error) {
      toast.error('Erro ao registrar: ' + error.message);
      return;
    }
    toast.success('Leitura registrada.');
    void logFeatureEvent('temp_logged');
    setTemperature('');
    setNotes('');
    void load();
  }

  const noCompany = isMaster && companies.length === 0;
  const activeEquipment = equipment.filter((e) => e.active);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Temperatura
          </h1>
          <p className="text-sm text-neutral-500">
            Registro de equipamentos e leituras (PMOC light).
          </p>
        </div>
        <Button onClick={openCreate} disabled={!companyId}>
          <Plus size={18} />
          Novo equipamento
        </Button>
      </div>

      {isMaster && companies.length > 0 && (
        <div className="mb-4 max-w-xs">
          <Select
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
      )}

      {noCompany ? (
        <Card>
          <p className="text-sm text-neutral-600">
            Nenhuma empresa cadastrada. Crie uma empresa para começar.
          </p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">
              Equipamentos
            </h2>
            {equipment.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Cadastre um equipamento para começar a registrar leituras.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {equipment.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {e.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {EQUIPMENT_TYPE_LABELS[e.type]} · {e.temp_min}°C a{' '}
                        {e.temp_max}°C
                        {!e.active ? ' · inativo' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => openEdit(e)}
                      aria-label="Editar"
                      className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100"
                    >
                      <Pencil size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">
              Registrar leitura
            </h2>
            {activeEquipment.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Cadastre um equipamento ativo primeiro.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <Select
                  label="Equipamento"
                  value={selectedEquip}
                  onChange={(e) => setSelectedEquip(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {activeEquipment.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.temp_min}°C / {e.temp_max}°C)
                    </option>
                  ))}
                </Select>
                <Input
                  id="temp"
                  label="Temperatura (°C)"
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="Ex.: -18.5"
                />
                <Input
                  id="notes"
                  label="Observações (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <Button onClick={handleRecord} loading={recording}>
                  <Thermometer size={18} />
                  Registrar
                </Button>
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">
              Últimas 20 leituras
            </h2>
            {logs.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nenhuma leitura registrada ainda.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {logs.map((l) => {
                  const outOfRange =
                    l.equipment &&
                    (l.temperature < l.equipment.temp_min ||
                      l.temperature > l.equipment.temp_max);
                  return (
                    <li key={l.id} className="flex items-center gap-3 py-2">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          outOfRange
                            ? 'bg-red-50 text-red-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {outOfRange ? (
                          <AlertTriangle size={16} />
                        ) : (
                          <Thermometer size={16} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-800">
                          {l.equipment?.name ?? 'Equipamento removido'} —{' '}
                          {l.temperature}°C
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatDateTime(l.recorded_at)}
                          {l.notes ? ` · ${l.notes}` : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar equipamento' : 'Novo equipamento'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="eq-name"
            label="Nome do equipamento"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Geladeira da cozinha"
          />
          <Select
            id="eq-type"
            label="Tipo"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as EquipmentType)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {EQUIPMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="eq-min"
              label="Temp. mínima (°C)"
              type="number"
              step="0.1"
              value={tempMin}
              onChange={(e) => setTempMin(e.target.value)}
            />
            <Input
              id="eq-max"
              label="Temp. máxima (°C)"
              type="number"
              step="0.1"
              value={tempMax}
              onChange={(e) => setTempMax(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={equipActive}
              onChange={(e) => setEquipActive(e.target.checked)}
              className="h-5 w-5 accent-emerald-600"
            />
            Equipamento ativo
          </label>
        </div>
      </Modal>
    </div>
  );
}
