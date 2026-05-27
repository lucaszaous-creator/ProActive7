import { useEffect, useState } from 'react';
import { AlertTriangle, Info, Wrench, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Announcement {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'maintenance';
}

const DISMISSED_KEY = 'p7_announcement_dismissed';

const STYLES = {
  info: {
    bg: 'bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
    icon: Info,
  },
  warning: {
    bg: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
    icon: AlertTriangle,
  },
  maintenance: {
    bg: 'bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100',
    icon: Wrench,
  },
} as const;

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    let mounted = true;
    void supabase.rpc('get_active_announcement').then(({ data, error }) => {
      if (!mounted || error || !data || data.length === 0) return;
      const a = data[0] as Announcement;
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed === a.id) return;
      setAnnouncement(a);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!announcement) return null;

  const style = STYLES[announcement.severity];
  const Icon = style.icon;

  return (
    <div className={`flex items-start gap-3 px-4 py-2.5 text-sm ${style.bg}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1 leading-snug">{announcement.message}</p>
      <button
        onClick={() => {
          localStorage.setItem(DISMISSED_KEY, announcement.id);
          setAnnouncement(null);
        }}
        className="shrink-0 rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Dispensar"
      >
        <X size={16} />
      </button>
    </div>
  );
}
