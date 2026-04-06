import { cardsDatabase } from '@/data/cardsDB';

const BASE = import.meta.env.BASE_URL;

let preloaded = false;

/**
 * Preloads card SVG images into browser cache in small background batches.
 * This avoids flooding the network/main thread during initial app paint.
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

  const queue = [...urls];
  const batchSize = 12;
  let index = 0;

  const warmUrl = (url: string) => {
    const prefetch = document.createElement('link');
    prefetch.rel = 'prefetch';
    prefetch.as = 'image';
    prefetch.href = url;
    document.head.appendChild(prefetch);

    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  };

  const runBatch = () => {
    const end = Math.min(index + batchSize, queue.length);
    for (let i = index; i < end; i += 1) {
      warmUrl(queue[i]);
    }
    index = end;

    if (index >= queue.length) return;

    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(runBatch);
      return;
    }

    window.setTimeout(runBatch, 16);
  };

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback(runBatch);
    return;
  }

  window.setTimeout(runBatch, 0);
}
