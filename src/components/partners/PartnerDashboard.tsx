import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogOut, Users, Loader2 } from "lucide-react";
import PartnerClientCard from "./PartnerClientCard";

interface PartnerDashboardProps {
  onLogout: () => void;
}

interface Client {
  id: string;
  email: string;
  full_name: string | null;
  channel_url: string | null;
  channel_name: string | null;
  assigned_at: string;
}

const PartnerDashboard = ({ onLogout }: PartnerDashboardProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState("");

  useEffect(() => {
    fetchPartnerData();
  }, []);

  const fetchPartnerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      console.log('Fetching data for partner:', user.id);

      // Get partner profile (for greeting)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      setPartnerName(profile?.full_name || profile?.email || 'Partner');

      // Fetch assigned clients via secure RPC to bypass profiles RLS safely
      const { data: clientsData, error: rpcError } = await supabase.rpc('get_clients_for_partner');
      if (rpcError) {
        console.error('get_clients_for_partner RPC error:', rpcError);
        toast.error(`Failed to load clients: ${rpcError.message}`);
        setClients([]);
        setLoading(false);
        return;
      }

      const clientsList: Client[] = (clientsData || []).map((c: any) => ({
        id: c.id,
        email: c.email,
        full_name: c.full_name,
        channel_url: c.channel_url,
        channel_name: c.channel_name,
        assigned_at: c.assigned_at,
      }));

      console.log('Final clients list from RPC:', clientsList);
      setClients(clientsList);

      if (clientsList.length > 0) {
        toast.success(`Loaded ${clientsList.length} client${clientsList.length > 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      console.error('Error fetching partner data:', error);
      toast.error(`Failed to load data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Partner Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {partnerName}</p>
          </div>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assigned Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clients.length}</div>
            <p className="text-sm text-muted-foreground">
              Total clients under your management
            </p>
          </CardContent>
        </Card>

        {/* Clients List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Clients</h2>
          {clients.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No clients assigned yet. Contact your administrator to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clients.map((client) => (
                <PartnerClientCard key={client.id} client={client} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;
