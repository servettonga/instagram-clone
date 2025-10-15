'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode; }) {
  const loadUser = useAuthStore((state) => state.loadUser);
  const pathname = usePathname();

  // Use ref to track if already attempted to load user to prevent multiple API calls
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Skip loading user on auth pages (login, signup, callback)
    // These pages handle their own authentication flow
    const isAuthPage = pathname?.startsWith('/auth/');
    
    if (!hasLoadedRef.current && !isAuthPage) {
      hasLoadedRef.current = true;
      loadUser();
    }
  }, [pathname, loadUser]);

  return <>{children}</>;
}
