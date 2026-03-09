import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Hook pro PWA install prompt ("Přidat na plochu").
 * Zachytí beforeinstallprompt a zpřístupní funkci triggerInstall().
 *
 * Použití:
 *   const { canInstall, triggerInstall, isInstalled } = usePWAInstall();
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Zjistit, jestli je aplikace již nainstalována (standalone mód)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handler = (e: Event) => {
      e.preventDefault(); // Zabránit automatickému banneru prohlížeče
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detekce úspěšné instalace
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) {
      // Na iOS / Safari beforeinstallprompt neexistuje — ukážeme instrukce
      alert(
        'Pro přidání na plochu:\n' +
        '• iPhone/iPad: Sdílet → "Přidat na plochu"\n' +
        '• Android Chrome: Menu (⋮) → "Přidat na plochu"\n' +
        '• Desktop Chrome/Edge: Ikona instalace v adresním řádku'
      );
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return {
    canInstall: !!deferredPrompt || !isInstalled,
    isInstalled,
    triggerInstall,
  };
}
