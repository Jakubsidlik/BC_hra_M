import { cardsDatabase } from '@/data/cardsDB';

const BASE = import.meta.env.BASE_URL;

let preloaded = false;
let preloadPromise: Promise<void> | null = null;

type PreloadMode = 'full' | 'load-only';

type PreloadConfig = {
  criticalCount: number;
  criticalConcurrency: number;
  restConcurrency: number;
  restMode: PreloadMode;
  yieldMs: number;
};

const IMAGE_LOAD_TIMEOUT_MS = 15000;
const FETCH_TIMEOUT_MS = 10000;

// Keep image elements alive for the whole session so decoded images stay warm.
const warmImageCache = new Map<string, HTMLImageElement>();
const preloadHints = new Set<string>();
const networkWarmCache = new Set<string>();

const supportsFetchPriority = (img: HTMLImageElement): img is HTMLImageElement & { fetchPriority: 'high' | 'low' | 'auto' } => {
  return 'fetchPriority' in img;
};

const getAggressivePreloadConfig = (): PreloadConfig => {
  const cores = navigator.hardwareConcurrency ?? 8;
  const tunedConcurrency = Math.min(36, Math.max(16, cores * 3));

  return {
    // We want every unique card image warm before gameplay starts.
    criticalCount: Number.MAX_SAFE_INTEGER,
    criticalConcurrency: tunedConcurrency,
    restConcurrency: tunedConcurrency,
    restMode: 'full',
    yieldMs: 0,
  };
};

const addPreloadHint = (url: string, priority: 'high' | 'low') => {
  if (preloadHints.has(url)) return;
  preloadHints.add(url);

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  if ('fetchPriority' in link) {
    (link as HTMLLinkElement & { fetchPriority?: 'high' | 'low' | 'auto' }).fetchPriority = priority;
  }
  document.head.appendChild(link);
};

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const primeHttpCache = async (url: string, priority: 'high' | 'low'): Promise<void> => {
  if (networkWarmCache.has(url)) return;
  networkWarmCache.add(url);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const init: RequestInit & { priority?: 'high' | 'low' | 'auto' } = {
      cache: 'force-cache',
      signal: controller.signal,
      priority,
    };
    await fetch(url, init);
  } catch {
    // Ignore fetch failures here; image warmup below still tries to load.
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const warmUrl = async (url: string, priority: 'high' | 'low', mode: PreloadMode): Promise<void> => {
  if (warmImageCache.has(url)) return;

  addPreloadHint(url, priority);
  await primeHttpCache(url, priority);

  await new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    if (supportsFetchPriority(img)) {
      img.fetchPriority = priority;
    }

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve();
    };

    const timeoutId = window.setTimeout(done, IMAGE_LOAD_TIMEOUT_MS);

    img.onload = () => {
      if (mode === 'load-only') {
        done();
        return;
      }
      if (typeof img.decode === 'function') {
        void img.decode().catch(() => undefined).finally(done);
        return;
      }
      done();
    };
    img.onerror = done;
    img.src = url;

    warmImageCache.set(url, img);
  });
};

const runQueue = async (queue: string[], concurrency: number, priority: 'high' | 'low', mode: PreloadMode, yieldMs: number) => {
  for (let i = 0; i < queue.length; i += concurrency) {
    const chunk = queue.slice(i, i + concurrency);
    await Promise.allSettled(chunk.map((url) => warmUrl(url, priority, mode)));

    if (yieldMs > 0 && i + concurrency < queue.length) {
      await sleep(yieldMs);
    }
  }
};

/**
 * Preloads card SVG images into browser cache with aggressive parallelism.
 * Loaded Image objects are kept alive so the browser can reuse decoded data
 * quickly for the whole game session.
 */
export function preloadCardImages(): Promise<void> {
  if (preloaded && preloadPromise) return preloadPromise;
  if (preloadPromise) return preloadPromise;

  const preloadConfig = getAggressivePreloadConfig();

  const weightedUrls = Object.values(cardsDatabase)
    .filter(card => !!card.image)
    .map(card => ({
      url: `${BASE}${card.image.replace(/^\//, '')}`,
      weight: Math.max(1, card.count ?? 1),
    }))
    .sort((a, b) => b.weight - a.weight);

  const dedupedQueue: string[] = [];
  const seen = new Set<string>();
  for (const entry of weightedUrls) {
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    dedupedQueue.push(entry.url);
  }

  const criticalQueue = dedupedQueue.slice(0, preloadConfig.criticalCount);
  const restQueue = dedupedQueue.slice(preloadConfig.criticalCount);

  preloadPromise = (async () => {
    await runQueue(
      criticalQueue,
      preloadConfig.criticalConcurrency,
      'high',
      'full',
      preloadConfig.yieldMs,
    );
    await runQueue(
      restQueue,
      preloadConfig.restConcurrency,
      'low',
      preloadConfig.restMode,
      preloadConfig.yieldMs,
    );
    preloaded = true;
  })();

  return preloadPromise;
}
