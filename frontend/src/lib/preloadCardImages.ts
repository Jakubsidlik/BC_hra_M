import { cardsDatabase } from '@/data/cardsDB';

const BASE = import.meta.env.BASE_URL;

let preloaded = false;

/**
 * Preloads all card SVG images into the browser cache.
 * Call once at app startup so cards render instantly when the game board appears.
 */
export function preloadCardImages(): void {
  if (preloaded) return;
  preloaded = true;

  const urls = new Set<string>();
  for (const card of Object.values(cardsDatabase)) {
    if (card.image) {
      urls.add(`${BASE}${card.image.replace(/^\//, '')}`);
    }
  }

  for (const url of urls) {
    const img = new Image();
    img.src = url;
  }
}
