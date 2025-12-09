'use client';

import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import { useSync } from '@/hooks/useSync';
import { useNavigation } from '@/lib/navigation-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LogOut, RefreshCw, History, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Settings() {
  const { user, signOut } = useAuth();
  const { status, lastSynced, sync } = useSync();
  const { theme, setTheme } = useTheme();
  const { navigate } = useNavigation();

  const formatLastSynced = () => {
    if (!lastSynced) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(lastSynced);
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      {/* Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Last synced</p>
              <p className="text-sm text-muted-foreground">{formatLastSynced()}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={sync}
              disabled={status === 'syncing'}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${status === 'syncing' ? 'animate-spin' : ''}`}
              />
              {status === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
          {status === 'error' && (
            <p className="text-sm text-destructive">Sync failed. Please try again.</p>
          )}
          {status === 'success' && (
            <p className="text-sm text-green-600">Synced successfully!</p>
          )}
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme('light')}
              className={cn(
                'flex-1',
                theme === 'light' && 'border-primary bg-primary/10'
              )}
            >
              <Sun className="h-4 w-4 mr-2" />
              Light
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme('dark')}
              className={cn(
                'flex-1',
                theme === 'dark' && 'border-primary bg-primary/10'
              )}
            >
              <Moon className="h-4 w-4 mr-2" />
              Dark
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme('system')}
              className={cn(
                'flex-1',
                theme === 'system' && 'border-primary bg-primary/10'
              )}
            >
              <Monitor className="h-4 w-4 mr-2" />
              System
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Link */}
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate('history')}
          >
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
