import { useState, useEffect } from 'react';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import BlogsSection from '@/components/admin/BlogsSection';
import { LogOut } from 'lucide-react';

const VALID_EMAIL = 'growth@swishview.com';
const VALID_PASSWORD = 'swishgrowth1';
const AUTH_KEY = 'blogs_mgmt_auth';

const BlogsManagement = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  // Restore auth state from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(AUTH_KEY);
    setIsAuthenticated(stored === 'true');
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === VALID_EMAIL && password === VALID_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem(AUTH_KEY, 'true');
    } else {
      toast({
        title: 'Access Denied',
        description: 'Invalid credentials. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(AUTH_KEY);
  };

  const noIndexHead = (
    <SEOHead
      title="Blogs Management - Internal"
      description="Internal admin tool"
      noindex={true}
      url="https://www.swishview.com/blogs-management"
    />
  );

  // Show nothing while checking auth state
  if (isAuthenticated === null) {
    return (
      <>
        {noIndexHead}
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src="/swishview-logo.png" alt="SwishView" className="h-16 mx-auto mb-4" />
            <CardTitle className="text-xl">Blogs Management</CardTitle>
            <p className="text-sm text-muted-foreground">Sign in to manage creators and blog posts</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Sign In</Button>
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
          <div className="flex items-center gap-3">
            <img src="/swishview-logo.png" alt="SwishView" className="h-14" />
            <h1 className="text-xl font-bold text-gray-900">Blogs Management</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>
      <div className="max-w-7xl mx-auto p-6">
        <BlogsSection />
      </div>
    </div>
  );
};

export default BlogsManagement;
