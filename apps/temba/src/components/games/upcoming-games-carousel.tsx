"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { UpcomingGameHeroCard } from "~/components/games/upcoming-game-hero-card";
import { cn } from "~/lib/utils";
import type { HubListSide } from "~/server/games";

export type UpcomingGamesCarouselItem = {
  id: string;
  startTime: Date | string;
  sport: string | null;
  format: string;
  venueName: string | null;
  registeredUserCount: number;
  playersAllowed: number | null;
  sides: HubListSide[];
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
};

export function UpcomingGamesCarousel({
  games,
  className,
}: {
  games: UpcomingGamesCarouselItem[];
  className?: string;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncActiveIndex = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    const slides = Array.from(scroller.children) as HTMLElement[];
    if (slides.length === 0) {
      return;
    }
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < slides.length; index += 1) {
      const slide = slides[index];
      if (!slide) {
        continue;
      }
      const distance = Math.abs(slide.offsetLeft - scroller.scrollLeft);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    setActiveIndex(bestIndex);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    syncActiveIndex();
    scroller.addEventListener("scroll", syncActiveIndex, { passive: true });
    window.addEventListener("resize", syncActiveIndex);
    return () => {
      scroller.removeEventListener("scroll", syncActiveIndex);
      window.removeEventListener("resize", syncActiveIndex);
    };
  }, [syncActiveIndex]);

  function scrollToIndex(index: number) {
    const scroller = scrollerRef.current;
    const slide = scroller?.children[index] as HTMLElement | undefined;
    if (!scroller || !slide) {
      return;
    }
    scroller.scrollTo({
      left: slide.offsetLeft,
      behavior: "smooth",
    });
    setActiveIndex(index);
  }

  if (games.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full min-w-0 max-w-full space-y-3", className)}>
      <ul
        ref={scrollerRef}
        className="flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
        aria-label="Your games"
        aria-roledescription="carousel"
      >
        {games.map((game, index) => (
          <li
            key={game.id}
            className="w-full min-w-full max-w-full shrink-0 grow-0 basis-full snap-start snap-always"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${games.length}`}
            aria-current={index === activeIndex ? "true" : undefined}
          >
            <UpcomingGameHeroCard
              href={`/dashboard/games/${game.id}`}
              startTime={game.startTime}
              sport={game.sport}
              format={game.format}
              venueName={game.venueName}
              registeredUserCount={game.registeredUserCount}
              playersAllowed={game.playersAllowed}
              sides={game.sides}
              levelMinTenths={game.levelMinTenths}
              levelMaxTenths={game.levelMaxTenths}
              className="w-full"
            />
          </li>
        ))}
      </ul>

      {games.length > 1 ? (
        <div
          className="flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Your game slides"
        >
          {games.map((game, index) => {
            const selected = index === activeIndex;
            return (
              <button
                key={game.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`Go to game ${index + 1}`}
                className={cn(
                  "focus-visible:ring-ring/50 h-2.5 rounded-full outline-none transition-all focus-visible:ring-[3px]",
                  selected
                    ? "bg-foreground w-6"
                    : "bg-muted-foreground/35 hover:bg-muted-foreground/55 w-2.5",
                )}
                onClick={() => {
                  scrollToIndex(index);
                }}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
