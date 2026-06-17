import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UserPlus, Users, Trash2, UserCog } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Partner {
  id: string;
  email: string;
  full_name: string | null;
  clientCount: number;
}

interface Client {
  id: string;
  email: string;
  full_name: string | null;
}

interface Assignment {
  id: string;
  partner: {
    email: string;
    full_name: string | null;
  };
  client: {
    email: string;
    full_name: string | null;
  };
  assigned_at: string;
}

const SEOPartnersSection = () => {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch partners from profiles.role = 'partner' and from user_roles = 'partner'
      const { data: partnersProfiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'partner');

      const { data: partnersRoles } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!user_roles_user_id_fkey (
            id,
            email,
            full_name
          )
        `)
        .eq('role', 'partner');

      // Fetch all users (potential clients)
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('email');

      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('partner_clients')
        .select(`
          id,
          assigned_at,
          partner_id,
          client_id
        `)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) {
        console.error('Assignments fetch error:', assignmentsError);
      }

      // Fetch partner and client details separately to avoid nested nulls
      const partnerIds = [...new Set(assignmentsData?.map(a => a.partner_id) || [])];
      const clientIds = [...new Set(assignmentsData?.map(a => a.client_id) || [])];

      const { data: partnerDetails } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', partnerIds);

      const { data: clientDetails } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', clientIds);

      // Create lookup maps
      const partnerMap = new Map(partnerDetails?.map(p => [p.id, p]) || []);
      const clientMap = new Map(clientDetails?.map(c => [c.id, c]) || []);

      // Count clients per partner
      const clientCounts: Record<string, number> = {};
      assignmentsData?.forEach((assignment: any) => {
        const partnerId = assignment.partner_id;
        if (partnerId) clientCounts[partnerId] = (clientCounts[partnerId] || 0) + 1;
      });

      // Merge partners from both sources and de-duplicate by id
      const partnersMap: Record<string, { id: string; email: string; full_name: string | null }> = {};
      (partnersProfiles || []).forEach((p: any) => {
        partnersMap[p.id] = { id: p.id, email: p.email, full_name: p.full_name };
      });
      (partnersRoles || []).forEach((r: any) => {
        const pr = r.profiles;
        if (pr) partnersMap[pr.id] = { id: pr.id, email: pr.email, full_name: pr.full_name };
      });

      const formattedPartners = Object.values(partnersMap)
        .map((p) => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          clientCount: clientCounts[p.id] || 0,
        }))
        .sort((a, b) => a.email.localeCompare(b.email));

      setPartners(formattedPartners);
      setClients(usersData || []);
      
      // Format assignments with proper null checking
      const formattedAssignments = assignmentsData?.map((assignment: any) => {
        const partner = partnerMap.get(assignment.partner_id);
        const client = clientMap.get(assignment.client_id);
        
        return {
          id: assignment.id,
          assigned_at: assignment.assigned_at,
          partner: {
            id: partner?.id || assignment.partner_id,
            email: partner?.email || 'Unknown',
            full_name: partner?.full_name || null
          },
          client: {
            id: client?.id || assignment.client_id,
            email: client?.email || 'Unknown',
            full_name: client?.full_name || null
          }
        };
      }).filter(a => a.partner && a.client) || [];

      setAssignments(formattedAssignments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to load partners data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClient = async () => {
    if (!selectedPartner || !selectedClient) {
      toast.error("Please select both partner and client");
      return;
    }

    setAssigning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('partner_clients')
        .insert({
          partner_id: selectedPartner,
          client_id: selectedClient,
          assigned_by: user.id,
        });

      if (error) throw error;

      toast.success("Client assigned successfully");
      setSelectedPartner("");
      setSelectedClient("");
      
      // Refresh data to update assignments
      await fetchData();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error("This client is already assigned to this partner");
      } else {
        toast.error(error.message || "Failed to assign client");
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('partner_clients')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success("Assignment removed");
      
      // Refresh data to update assignments
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove assignment");
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partners.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Assign Client Form */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Client to Partner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Partner</Label>
              <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                <SelectTrigger>
                  <SelectValue placeholder="Select partner..." />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.full_name || partner.email} ({partner.clientCount} clients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name || client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleAssignClient} disabled={assigning} className="w-full">
            {assigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign Client
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No assignments yet
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {assignment.partner.full_name || assignment.partner.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.partner.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {assignment.client.full_name || assignment.client.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.client.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(assignment.assigned_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SEOPartnersSection;
