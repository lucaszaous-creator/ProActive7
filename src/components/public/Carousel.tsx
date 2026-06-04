import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselProps {
  /** Cada filho vira um slide (largura controlada por `slideBasis`). */
  children: ReactNode[];
  /**
   * Classe(s) Tailwind de largura do slide (flex-basis). Default mostra
   * ~1,2 cards no mobile e 3 no desktop — o padrão do site.
   */
  slideBasis?: string;
  /** Rótulo acessível do carrossel. */
  ariaLabel?: string;
  /** Alinhamento do snap. */
  align?: 'start' | 'center';
}

/**
 * Carrossel do site público (Embla). Setas de navegação + bullets,
 * arrasto no touch, snap por card. Segue o design system verde
 * (#2F5D3F / #E8F1EA). Use quando houver mais de 4 cards.
 */
export function Carousel({
  children,
  slideBasis = 'basis-[82%] sm:basis-1/2 lg:basis-1/3',
  ariaLabel = 'Carrossel',
  align = 'start',
}: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align,
    loop: false,
    dragFree: false,
    containScroll: 'trimSnaps',
  });

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [snaps, setSnaps] = useState<number[]>([]);
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback((api: NonNullable<typeof emblaApi>) => {
    setCanPrev(api.canScrollPrev());
    setCanNext(api.canScrollNext());
    setSelected(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    setSnaps(emblaApi.scrollSnapList());
    onSelect(emblaApi);
    emblaApi.on('select', onSelect).on('reInit', (api) => {
      setSnaps(api.scrollSnapList());
      onSelect(api);
    });
  }, [emblaApi, onSelect]);

  return (
    <div className="relative" aria-roledescription="carrossel" aria-label={ariaLabel}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-5">
          {children.map((child, i) => (
            <div key={i} className={`min-w-0 shrink-0 grow-0 ${slideBasis}`}>
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Controles — só aparecem se houver mais de um snap */}
      {snaps.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label="Anterior"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2F5D3F]/20 bg-white text-[#2F5D3F] transition hover:border-[#2F5D3F]/50 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1.5">
            {snaps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Ir para o slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === selected
                    ? 'w-6 bg-[#2F5D3F]'
                    : 'w-2 bg-[#2F5D3F]/25 hover:bg-[#2F5D3F]/45'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canNext}
            aria-label="Próximo"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#2F5D3F]/20 bg-white text-[#2F5D3F] transition hover:border-[#2F5D3F]/50 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
