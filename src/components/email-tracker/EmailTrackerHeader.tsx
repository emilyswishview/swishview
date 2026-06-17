import { ArrowLeft, Moon, Sun, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ActiveView } from './EmailTrackerDashboard';

interface EmailTrackerHeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  activeView: ActiveView;
  selectedEmployee: string | null;
  onBack: () => void;
}

const viewTitles: Record<ActiveView, string> = {
  overview: 'Dashboard Overview',
  employees: 'Employee Directory',
  'employee-detail': 'Employee Details',
  settings: 'Settings',
};

export function EmailTrackerHeader({
  isDarkMode,
  toggleTheme,
  activeView,
  selectedEmployee,
  onBack,
}: EmailTrackerHeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('email-tracker-sync', {
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.success) {
        toast({
          title: 'Sync Complete',
          description: `Processed ${data.processed} emails (${data.skipped} skipped duplicates)`,
        });
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Unable to sync email data',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {activeView === 'employee-detail' && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {activeView === 'employee-detail' && selectedEmployee
              ? selectedEmployee
              : viewTitles[activeView]}
          </h1>
          {activeView === 'employee-detail' && selectedEmployee && (
            <p className="text-sm text-muted-foreground">Employee email activity</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}