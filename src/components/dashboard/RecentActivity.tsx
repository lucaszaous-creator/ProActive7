import { Link } from 'react-router-dom';
import { Activity, AlertOctagon, ClipboardCheck, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from './Skeleton';
import type { ActivityItem, ActivityKind } from '@/lib/dashboardQueries';

interface RecentActivityProps {
  loading: boolean;
  items: ActivityItem[];
}

const ICON: Record<ActivityKind, LucideIcon> = {
  nc_opened: AlertOctagon,
  audit_completed: ClipboardCheck,
  doc_published: FileText,
};

const ICON_COLOR: Record<ActivityKind, string> = {
  nc_opened: 'text-red-600',
  audit_completed: 'text-neutral-600',
  doc_published: 'text-blue-600',
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d}d`;
}

export function RecentActivity({ loading, items }: RecentActivityProps) {
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700">
        <Activity size={16} className="text-neutral-600" />
        Atividade recente
      </h2>
      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-500">
          Nenhuma atividade nos últimos 14 dias.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100">
          {items.map((it) => {
            const Icon = ICON[it.kind];
            return (
              <li key={`${it.kind}-${it.id}`}>
                <Link
                  to={it.href}
                  className="flex items-start gap-3 py-2 text-sm hover:bg-neutral-50"
                >
                  <Icon
                    size={16}
                    className={`mt-0.5 shrink-0 ${ICON_COLOR[it.kind]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-neutral-800">{it.summary}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {it.companyName ? `${it.companyName} · ` : ''}
                      {relativeTime(it.at)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
