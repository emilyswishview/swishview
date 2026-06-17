import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import CampaignUsersPage from '@/components/campaign-mgmt/CampaignUsersPage';
import CampaignUserDetail from '@/components/campaign-mgmt/CampaignUserDetail';

const CampaignManagement = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsAuthenticated(false);
      return;
    }

    const { data, error } = await (supabase as any).rpc('is_swishview_staff', {
      _user_id: session.user.id,
    });

    if (error) {
      console.error('Error checking staff access:', error);
      setIsAuthenticated(false);
      return;
    }

    setIsAuthenticated(Boolean(data));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith('@swishview.com')) {
      toast({ title: 'Access Denied', description: 'Only SwishView employees can access this page.', variant: 'destructive' });
      return;
    }
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
      } else {
        const { data: isStaff, error: accessError } = await (supabase as any).rpc('is_swishview_staff', {
          _user_id: data.user.id,
        });

        if (accessError || !isStaff) {
          await supabase.auth.signOut();
          toast({
            title: 'Access Denied',
            description: 'This account does not have Campaign Management access.',
            variant: 'destructive'
          });
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Campaign Management</CardTitle>
            <p className="text-sm text-muted-foreground">Sign in with your SwishView credentials</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your @swishview.com email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Campaign Management</h1>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>
      <div className="max-w-7xl mx-auto p-6">
        <CampaignManagementRouter />
      </div>
    </div>
  );
};

const CampaignManagementRouter = () => {
  const { userId } = useParams();

  if (userId) {
    return <CampaignUserDetail userId={userId} />;
  }
  return <CampaignUsersPage />;
};

export default CampaignManagement;
