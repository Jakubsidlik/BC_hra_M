import { useState, useEffect } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

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
