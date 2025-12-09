'use client';

import { LayoutDashboard, Languages, UtensilsCrossed, Dumbbell } from 'lucide-react';
import { useNavigation, type MainRoute } from '@/lib/navigation-context';
import { cn } from '@/lib/utils';

const navItems: { route: MainRoute; label: string; icon: typeof LayoutDashboard }[] = [
  { route: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { route: 'japanese', label: 'Japanese', icon: Languages },
  { route: 'nutrition', label: 'Nutrition', icon: UtensilsCrossed },
  { route: 'sport', label: 'Sport', icon: Dumbbell },
];

export function BottomNav() {
  const { state, navigate } = useNavigation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = state.route === item.route && !state.subRoute;
          const Icon = item.icon;

          return (
            <button
              key={item.route}
              onPointerDown={() => navigate(item.route)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
