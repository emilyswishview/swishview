
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Download, Calendar, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Subscriber {
  id: string;
  email: string;
  subscribed_at: string;
}

const SubscribersSection = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<"email" | "subscribed_at">("subscribed_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscribers();
  }, []);

  useEffect(() => {
    filterAndSortSubscribers();
  }, [subscribers, searchTerm, sortField, sortDirection]);

  const fetchSubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from("email_subscriptions")
        .select("*")
        .order("subscribed_at", { ascending: false });

      if (error) throw error;
      setSubscribers(data || []);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch subscribers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortSubscribers = () => {
    let filtered = subscribers.filter(subscriber =>
      subscriber.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === "email") {
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
      } else {
        aValue = new Date(a.subscribed_at).getTime();
        bValue = new Date(b.subscribed_at).getTime();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredSubscribers(filtered);
  };

  const handleSort = (field: "email" | "subscribed_at") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Email", "Date Subscribed"],
      ...filteredSubscribers.map(sub => [
        sub.email,
        new Date(sub.subscribed_at).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Subscribers data has been exported to CSV",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Subscribers</CardTitle>
          <CardDescription>Loading subscriber data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Subscribers
              </CardTitle>
              <CardDescription>
                Manage and view newsletter subscribers ({filteredSubscribers.length} total)
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search by email address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredSubscribers.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No subscribers found</h3>
              <p className="text-gray-500">
                {searchTerm ? "Try adjusting your search terms" : "No one has subscribed to the newsletter yet"}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("email")}
                    >
                      Email Address
                      {sortField === "email" && (
                        <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("subscribed_at")}
                    >
                      Date Subscribed
                      {sortField === "subscribed_at" && (
                        <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.map((subscriber) => (
                    <TableRow
                      key={subscriber.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedSubscriber(subscriber)}
                    >
                      <TableCell className="font-medium">{subscriber.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {new Date(subscriber.subscribed_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Newsletter Form</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscriber Detail Modal */}
      <Dialog open={!!selectedSubscriber} onOpenChange={() => setSelectedSubscriber(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscriber Details</DialogTitle>
            <DialogDescription>
              Full information for this newsletter subscriber
            </DialogDescription>
          </DialogHeader>
          {selectedSubscriber && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Email Address</label>
                <p className="text-lg font-medium">{selectedSubscriber.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Subscription Date</label>
                <p className="text-lg">
                  {new Date(selectedSubscriber.subscribed_at).toLocaleDateString()} at {" "}
                  {new Date(selectedSubscriber.subscribed_at).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Source</label>
                <Badge variant="secondary" className="ml-2">Newsletter Form</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Subscriber ID</label>
                <p className="text-sm text-gray-500 font-mono">{selectedSubscriber.id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscribersSection;
