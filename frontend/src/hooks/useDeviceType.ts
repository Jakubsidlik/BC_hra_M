import { useState, useEffect } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const platform = navigator.platform ?? '';
  const userAgent = navigator.userAgent ?? '';
  const isIPhoneOrIPad = /iPad|iPhone|iPod/.test(platform) || /iPad|iPhone|iPod/.test(userAgent);
  const isIPadOS = platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return isIPhoneOrIPad || isIPadOS;
}

function getDeviceType(width: number): DeviceType {
  if (width < 768) return 'phone';
  if (width < 1280) return 'tablet';
  return 'desktop';
}

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() =>
    getDeviceType(window.innerWidth)
  );

  useEffect(() => {
    const handler = () => setDeviceType(getDeviceType(window.innerWidth));
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return deviceType;
}
