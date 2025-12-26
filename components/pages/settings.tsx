'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/lib/auth-context';
import { useSync } from '@/hooks/useSync';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useNavigation } from '@/lib/navigation-context';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut, RefreshCw, History, Sun, Moon, Monitor, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Settings() {
  const { user, signOut } = useAuth();
  const { status, lastSynced, sync } = useSync();
  const { updateAvailable, refreshApp } = useServiceWorker();
  const { theme, setTheme } = useTheme();
  const { navigate } = useNavigation();
  const settings = useAppStore((s) => s.settings);
  const setJapaneseDailyGoal = useAppStore((s) => s.setJapaneseDailyGoal);
  const setWeightGoal = useAppStore((s) => s.setWeightGoal);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dailyGoalInput, setDailyGoalInput] = useState(String(settings.japaneseDailyGoalMinutes));
  const [weightGoalInput, setWeightGoalInput] = useState(String(settings.weightGoalKg));

  const handleDailyGoalChange = (value: string) => {
    setDailyGoalInput(value);
    const minutes = parseInt(value, 10);
    if (!isNaN(minutes) && minutes > 0) {
      setJapaneseDailyGoal(minutes);
    }
  };

  const handleWeightGoalChange = (value: string) => {
    setWeightGoalInput(value);
    const kg = parseFloat(value);
    if (!isNaN(kg) && kg > 0) {
      setWeightGoal(kg);
    }
  };

  const handleRefreshApp = async () => {
    setIsRefreshing(true);
    await refreshApp();
    // Note: page will reload, so setIsRefreshing(false) won't be reached
  };

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

      {/* Japanese Daily Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Japanese Study Goal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label htmlFor="dailyGoal" className="text-sm text-muted-foreground whitespace-nowrap">
              Daily goal:
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="dailyGoal"
                type="number"
                min="1"
                max="480"
                value={dailyGoalInput}
                onChange={(e) => handleDailyGoalChange(e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weight Goal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label htmlFor="weightGoal" className="text-sm text-muted-foreground whitespace-nowrap">
              Target weight:
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="weightGoal"
                type="number"
                min="30"
                max="200"
                step="0.1"
                value={weightGoalInput}
                onChange={(e) => handleWeightGoalChange(e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">kg</span>
            </div>
          </div>
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
              pressMode="press"
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
              pressMode="press"
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
              pressMode="press"
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

      {/* App Update */}
      <Card className={updateAvailable ? 'border-primary' : ''}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            App
            {updateAvailable && (
              <span className="text-xs font-normal text-primary">Update available</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                {updateAvailable ? 'Update App' : 'Refresh App'}
              </p>
              <p className="text-sm text-muted-foreground">
                {updateAvailable 
                  ? 'A new version is available' 
                  : 'Clear cache and get latest version'}
              </p>
            </div>
            <Button
              variant={updateAvailable ? 'default' : 'outline'}
              size="sm"
              onClick={handleRefreshApp}
              disabled={isRefreshing}
            >
              <RotateCcw
                className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Updating...' : 'Update'}
            </Button>
          </div>
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
