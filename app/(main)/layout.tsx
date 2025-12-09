'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
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
  const { navigate } = useNavigation();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <h1 className="text-lg font-semibold">Life</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate('settings')}>
          <SettingsIcon className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </div>
    </header>
  );
}

export default function MainLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
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
