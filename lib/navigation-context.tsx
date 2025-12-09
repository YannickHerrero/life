'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type MainRoute = 'dashboard' | 'japanese' | 'nutrition' | 'sport' | 'settings' | 'history';
export type SubRoute = 'japanese/reading' | null;

interface NavigationState {
  route: MainRoute;
  subRoute: SubRoute;
}

interface NavigationContextType {
  state: NavigationState;
  navigate: (route: MainRoute, subRoute?: SubRoute) => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NavigationState>({
    route: 'dashboard',
    subRoute: null,
  });

  // Sync URL hash for back button support
  useEffect(() => {
    const path = state.subRoute || state.route;
    window.history.pushState(null, '', `#${path}`);
  }, [state]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.slice(1) || 'dashboard';
      if (hash === 'japanese/reading') {
        setState({ route: 'japanese', subRoute: 'japanese/reading' });
      } else if (['dashboard', 'japanese', 'nutrition', 'sport', 'settings', 'history'].includes(hash)) {
        setState({ route: hash as MainRoute, subRoute: null });
      } else {
        setState({ route: 'dashboard', subRoute: null });
      }
    };

    window.addEventListener('popstate', handlePopState);
    // Initialize from URL on mount
    handlePopState();
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((route: MainRoute, subRoute?: SubRoute) => {
    setState({ route, subRoute: subRoute || null });
  }, []);

  const goBack = useCallback(() => {
    if (state.subRoute) {
      setState({ route: state.route, subRoute: null });
    }
  }, [state.route, state.subRoute]);

  return (
    <NavigationContext.Provider value={{ state, navigate, goBack }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
