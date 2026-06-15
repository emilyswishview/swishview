import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Settings2,
  Database,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';

interface SyncConfig {
  id: string;
  domain: string;
  last_sync_at: string | null;
  sync_status: string;
  last_error: string | null;
  updated_at: string;
}

export function EmailTrackerSettings() {
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSyncConfig();
  }, []);

  const fetchSyncConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('email_tracker_sync_config')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setSyncConfig(data);
      }
    } catch (error) {
      console.error('Error fetching sync config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
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
          description: `Successfully synced ${data.processed} emails from ${data.domain}`,
        });
        fetchSyncConfig();
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'syncing':
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Syncing</Badge>;
      default:
        return <Badge variant="secondary">Idle</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Sync Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle>Sync Configuration</CardTitle>
          </div>
          <CardDescription>
            Email data synchronization from Google Workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {syncConfig ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">Domain</p>
                  <p className="text-lg font-semibold mt-1">{syncConfig.domain}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(syncConfig.sync_status)}
                    {getStatusBadge(syncConfig.sync_status)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">Last Sync</p>
                  <p className="text-lg font-semibold mt-1">
                    {syncConfig.last_sync_at
                      ? format(new Date(syncConfig.last_sync_at), 'MMM d, yyyy h:mm a')
                      : 'Never'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-lg font-semibold mt-1">
                    {format(new Date(syncConfig.updated_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>

              {syncConfig.last_error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 text-red-500 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="font-medium">Last Error</p>
                  </div>
                  <p className="text-sm text-red-500/80">{syncConfig.last_error}</p>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sync configuration found. Run your first sync to get started.</p>
            </div>
          )}

          <Button
            onClick={handleManualSync}
            disabled={isSyncing}
            variant="default"
            className="w-full md:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Run Manual Sync'}
          </Button>
        </CardContent>
      </Card>

      {/* Security Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Security & Privacy</CardTitle>
          </div>
          <CardDescription>
            Information about data handling and security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-muted/50">
            <h4 className="font-medium mb-2">Data Storage</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Email metadata (sender, recipients, timestamps) is stored securely</li>
              <li>• Email body content is NOT stored</li>
              <li>• Data is encrypted at rest and in transit</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <h4 className="font-medium mb-2">Access Control</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Only admin users can access this dashboard</li>
              <li>• All API requests are authenticated</li>
              <li>• Google Workspace credentials are stored securely in environment variables</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <h4 className="font-medium mb-2">Sync Schedule</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Automatic sync runs every 15 minutes (when cron is configured)</li>
              <li>• Manual sync available with rate limiting (5 minute cooldown)</li>
              <li>• Duplicate emails are automatically filtered</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Required configuration for email tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card">
            <h4 className="font-medium mb-3 text-foreground">1. Google Workspace Setup</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Create a service account in Google Cloud Console</li>
              <li>Enable the Admin SDK API</li>
              <li>Enable domain-wide delegation for the service account</li>
              <li>Grant the scope: <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs">https://www.googleapis.com/auth/admin.reports.audit.readonly</code></li>
            </ol>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <h4 className="font-medium mb-3 text-foreground">2. Environment Variables</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li><code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs">GOOGLE_WORKSPACE_SERVICE_ACCOUNT_KEY</code> - Service account JSON key (stringified)</li>
              <li><code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs">GOOGLE_WORKSPACE_ADMIN_EMAIL</code> - Admin email to impersonate</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <h4 className="font-medium mb-3 text-foreground">3. Automated Sync (Optional)</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Set up a cron job in Supabase to run the sync automatically:
            </p>
            <pre className="bg-muted/80 text-foreground p-3 rounded-lg text-xs overflow-x-auto border border-border">
{`SELECT cron.schedule(
  'email-tracker-sync',
  '*/15 * * * *',
  $$SELECT net.http_post(
    url := 'https://nuxixhoogohqligzgbdm.supabase.co/functions/v1/email-tracker-sync',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )$$
);`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}