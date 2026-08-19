import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Upload, X, ImageIcon, Maximize2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PhotoLightbox } from './PhotoLightbox';

const BUCKET = 'photos';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface Props {
  /** Empresa onde a foto será criada. Se null, o componente fica desabilitado. */
  companyId: string | null;
  /** ID da foto atualmente vinculada (na tabela `photos`). */
  photoId: string | null | undefined;
  /** Avisa o pai quando o usuário anexa/remove a foto. */
  onChange: (photoId: string | null) => void;
  /** Rótulo visível (ex.: "Foto da evidência"). */
  label?: string;
  /** Texto auxiliar abaixo do rótulo. */
  description?: string;
  /** Bloqueia interação. */
  disabled?: boolean;
}

/**
 * Botão de anexar foto para vincular a um registro (NC, checklist run,
 * etc.). Faz upload no bucket `photos` e cria linha em `photos` —
 * compartilha o mesmo armazenamento da página /fotos, então a cleanup
 * function de 30 dias também limpa estas. Devolve o `photo_id` no
 * onChange para o pai persistir junto com o registro.
 *
 * Não exclui a foto do bucket ao "remover" — apenas zera o vínculo (o
 * usuário pode preferir manter a foto na galeria geral). A foto será
 * descartada quando a cleanup function rodar (30 dias) se ninguém mais
 * referenciar.
 */
export function PhotoAttacher({
  companyId,
  photoId,
  onChange,
  label = 'Foto',
  description,
  disabled = false,
}: Props) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Carrega URL assinada quando muda o photoId (preview existente).
  useEffect(() => {
    let cancelled = false;
    if (!photoId) {
      setPreviewUrl(null);
      return;
    }
    void (async () => {
      const { data: row } = await supabase
        .from('photos')
        .select('storage_path, original_name')
        .eq('id', photoId)
        .maybeSingle();
      if (cancelled || !row?.storage_path) return;
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, 3600);
      if (!cancelled) {
        setPreviewUrl(data?.signedUrl ?? null);
        setOriginalName(row.original_name ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [photoId]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!companyId) {
      toast.error('Selecione uma empresa antes de anexar foto.');
      return;
    }
    // Foto não entra na fila offline: é upload de binário para o Storage,
    // e guardar a imagem no aparelho por tempo indeterminado esbarra na
    // retenção de 30 dias que vale para toda foto (CLAUDE.md §1). Melhor
    // dizer a verdade agora do que "salvar" algo que nunca vai subir.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error(
        'Foto precisa de conexão. O resto do preenchimento fica salvo; anexe a foto quando o sinal voltar.',
      );
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('A imagem deve ter no máximo 10 MB.');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${companyId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: row, error: insErr } = await supabase
        .from('photos')
        .insert({
          company_id: companyId,
          storage_path: path,
          original_name: file.name,
          uploaded_by: profile?.id ?? null,
        })
        .select('id')
        .single();
      if (insErr) {
        // Cleanup do arquivo órfão.
        const { error: rmErr } = await supabase.storage
          .from(BUCKET)
          .remove([path]);
        if (rmErr) console.warn('Falha ao remover foto órfã:', rmErr.message);
        throw insErr;
      }
      onChange(row.id);
      toast.success('Foto anexada.');
    } catch (e) {
      toast.error('Erro ao enviar foto: ' + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium text-neutral-700">{label}</p>
        {description ? (
          <p className="text-xs text-neutral-500">{description}</p>
        ) : null}
      </div>

      {photoId && previewUrl ? (
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            title="Clique para expandir"
            className="group relative block overflow-hidden rounded-lg border border-neutral-200 transition hover:border-neutral-400"
          >
            <img
              src={previewUrl}
              alt="Foto anexada"
              className="h-32 w-32 object-cover transition group-hover:opacity-90"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
              <Maximize2
                size={18}
                className="text-white opacity-0 transition group-hover:opacity-100"
              />
            </span>
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || uploading}
            title="Remover anexo (a foto continua na galeria)"
            aria-label="Remover foto"
            className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-600 shadow ring-1 ring-neutral-200 hover:bg-red-50 disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>
      ) : photoId && !previewUrl ? (
        <div className="inline-flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-400">
          <ImageIcon size={20} />
        </div>
      ) : (
        <label
          className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 ${
            disabled || uploading || !companyId
              ? 'pointer-events-none opacity-60'
              : ''
          }`}
        >
          {uploading ? (
            <>
              <Upload size={14} className="animate-pulse" />
              Enviando…
            </>
          ) : (
            <>
              <Camera size={14} />
              Anexar foto
            </>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
            disabled={disabled || uploading || !companyId}
          />
        </label>
      )}

      <PhotoLightbox
        url={lightboxOpen ? previewUrl : null}
        fileName={originalName}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
