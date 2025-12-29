'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAppStore } from '@/lib/store';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { NavigationProvider, useNavigation } from '@/lib/navigation-context';
import { BottomNav } from '@/components/bottom-nav';
import { Button } from '@/components/ui/button';

// Import page components
import { Dashboard } from '@/components/pages/dashboard';
import { Japanese } from '@/components/pages/japanese';
import { JapaneseReading } from '@/components/pages/japanese-reading';
import { Nutrition } from '@/components/pages/nutrition';
import { Sport } from '@/components/pages/sport';
import { Settings } from '@/components/pages/settings';
import { History } from '@/components/pages/history';

function MainContent() {
  const { state } = useNavigation();

  // Render sub-routes first
  if (state.subRoute === 'japanese/reading') {
    return <JapaneseReading />;
  }

  // Render main routes
  switch (state.route) {
    case 'dashboard':
      return <Dashboard />;
    case 'japanese':
      return <Japanese />;
    case 'nutrition':
      return <Nutrition />;
    case 'sport':
      return <Sport />;
    case 'settings':
      return <Settings />;
    case 'history':
      return <History />;
    default:
      return <Dashboard />;
  }
}

function Header() {
  const { state, navigate } = useNavigation();
  const { updateAvailable } = useServiceWorker();
  const isSettingsPage = state.route === 'settings' || state.route === 'history';

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <h1 className="text-lg font-semibold">Life</h1>
        {!isSettingsPage && (
          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('settings')}>
            <SettingsIcon className="h-5 w-5" />
            {updateAvailable && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-primary" />
            )}
            <span className="sr-only">Settings</span>
          </Button>
        )}
      </div>
    </header>
  );
}

export default function MainLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isReady, isLoading: dataLoading, preloadAll } = useAppStore();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Preload data when user is authenticated
  useEffect(() => {
    if (user && !isReady && !dataLoading) {
      preloadAll();
    }
  }, [user, isReady, dataLoading, preloadAll]);

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show loading while data is being preloaded
  if (!isReady) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <NavigationProvider>
      <div className="min-h-dvh flex flex-col bg-background">
        <Header />
        <main className="flex-1 pb-20">
          <MainContent />
        </main>
        <BottomNav />
      </div>
    </NavigationProvider>
  );
}
