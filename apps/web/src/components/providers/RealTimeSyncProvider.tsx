'use client';

import { useRealTimeSync } from '@/hooks/useRealTimeSync';

export function RealTimeSyncProvider({ children }: { children: React.ReactNode }) {
  useRealTimeSync();
  return <>{children}</>;
}
