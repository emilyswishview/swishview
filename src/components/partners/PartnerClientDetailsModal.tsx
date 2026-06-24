import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  Send, 
  Activity, 
  MessageSquare, 
  BarChart3,
  PlayCircle,
  TrendingUp,
  Eye,
  DollarSign,
  FileText,
  Download,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import UserSEOAnalyticsView from "@/components/admin/UserSEOAnalyticsView";

interface Client {
  id: string;
  email: string;
  full_name: string | null;
  channel_url: string | null;
  channel_name: string | null;
}

interface PartnerClientDetailsModalProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PartnerClientDetailsModal = ({ client, open, onOpenChange }: PartnerClientDetailsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [seoPurchases, setSeoPurchases] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [activityText, setActivityText] = useState("");
  const [sending, setSending] = useState(false);
  const [campaignsExpanded, setCampaignsExpanded] = useState(true);
  const [seoExpanded, setSeoExpanded] = useState(false);

  useEffect(() => {
    if (open) {
      fetchClientData();
    }
  }, [open, client.id]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from('promotions')
        .select('*')
        .eq('user_id', client.id)
        .order('created_at', { ascending: false });

      setCampaigns(campaignsData || []);

      // Fetch SEO purchases with plan details
      const { data: seoData } = await supabase
        .from('seo_purchases')
        .select(`
          *,
          seo_plans:seo_plan_id (
            name,
            duration_months,
            features
          )
        `)
        .eq('user_id', client.id)
        .order('created_at', { ascending: false });

      setSeoPurchases(seoData || []);

      // Fetch recent activities
      const { data: activitiesData } = await supabase
        .from('recent_activities')
        .select('*')
        .eq('user_id', client.id)
        .order('activity_date', { ascending: false })
        .limit(10);

      setRecentActivities(activitiesData || []);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      toast.error("Please fill in both title and message");
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('admin_messages')
        .insert({
          user_id: client.id,
          admin_id: user.id,
          title: messageTitle,
          message: messageContent,
          updated_by: user.email || 'Partner'
        });

      if (error) throw error;

      toast.success("Message sent successfully");
      setMessageTitle("");
      setMessageContent("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleAddActivity = async () => {
    if (!activityText.trim()) {
      toast.error("Please enter activity text");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('recent_activities')
        .insert({
          user_id: client.id,
          activity_text: activityText,
          activity_date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      toast.success("Activity added successfully");
      setActivityText("");
      fetchClientData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add activity");
    } finally {
      setSending(false);
    }
  };

  const calculateProgress = (current: number, target: number, starting: number = 0) => {
    const gained = Math.max(0, current - starting);
    return Math.min(100, (gained / target) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'paused':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {client.full_name || client.email}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{client.email}</p>
        </DialogHeader>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="seo">
              <TrendingUp className="h-4 w-4 mr-2" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="message">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Activities
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="analytics" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Video Campaign Analytics */}
                  <Collapsible open={campaignsExpanded} onOpenChange={setCampaignsExpanded}>
                    <CollapsibleTrigger asChild>
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <PlayCircle className="h-5 w-5 text-primary" />
                              Video Campaigns
                              <Badge variant="secondary">{campaigns.length} campaigns</Badge>
                            </div>
                            {campaignsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </CardTitle>
                        </CardHeader>
                      </Card>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Card className="mt-2">
                        <CardContent className="p-6">
                          {campaigns.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No campaigns found for this client</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {campaigns.map((campaign) => {
                                const progress = calculateProgress(campaign.current_views, campaign.target_views, campaign.starting_views);
                                const viewsGained = Math.max(0, campaign.current_views - (campaign.starting_views || 0));
                                const derivedStatus = viewsGained >= (campaign.target_views || 0) ? "completed" : (campaign.status === "pending" ? "pending" : "active");
                                
                                return (
                                  <Card key={campaign.id} className="border-l-4 border-l-primary shadow-sm">
                                    <CardContent className="p-6">
                                      <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <h4 className="font-bold text-lg">{campaign.title}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">
                                              Created: {format(new Date(campaign.created_at), 'MMM dd, yyyy')}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              Target Audience: {campaign.target_audience || 'General'}
                                            </p>
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <Badge className={getStatusColor(derivedStatus)}>
                                              {derivedStatus}
                                            </Badge>
                                            <Badge variant="outline">
                                              <DollarSign className="h-3 w-3 mr-1" />
                                              ${campaign.budget}
                                            </Badge>
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-4 text-sm bg-muted p-4 rounded-lg">
                                          <div>
                                            <div className="text-muted-foreground">Starting</div>
                                            <div className="font-bold text-lg flex items-center gap-1">
                                              <PlayCircle className="h-4 w-4" />
                                              {(campaign.starting_views || 0).toLocaleString()}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-muted-foreground">Current</div>
                                            <div className="font-bold text-lg flex items-center gap-1">
                                              <Eye className="h-4 w-4" />
                                              {campaign.current_views.toLocaleString()}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-muted-foreground">Gained</div>
                                            <div className="font-bold text-lg flex items-center gap-1 text-green-600">
                                              <TrendingUp className="h-4 w-4" />
                                              +{viewsGained.toLocaleString()}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="space-y-3">
                                          <div className="flex justify-between text-sm">
                                            <span className="font-medium">Progress to Target ({campaign.target_views.toLocaleString()} views)</span>
                                            <span className="font-bold text-primary">{progress.toFixed(1)}%</span>
                                          </div>
                                          <Progress value={progress} className="h-3" />
                                          <div className="text-xs text-muted-foreground">
                                            Duration: {campaign.campaign_duration || 30} days
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* SEO Purchases */}
                  <Collapsible open={seoExpanded} onOpenChange={setSeoExpanded}>
                    <CollapsibleTrigger asChild>
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-green-600" />
                              SEO Services
                              <Badge variant="secondary">{seoPurchases.length} services</Badge>
                            </div>
                            {seoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </CardTitle>
                        </CardHeader>
                      </Card>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Card className="mt-2">
                        <CardContent className="p-6">
                          {seoPurchases.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No SEO services found for this client</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {seoPurchases.map((purchase: any) => (
                                <Card key={purchase.id} className="border-l-4 border-l-green-500">
                                  <CardContent className="p-4">
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h5 className="font-semibold">{purchase.seo_plans?.name || 'Unknown Plan'}</h5>
                                          <p className="text-sm text-muted-foreground">
                                            {purchase.seo_plans?.duration_months} months duration
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <Badge className={getStatusColor(purchase.status)}>
                                            {purchase.status}
                                          </Badge>
                                          <p className="text-sm font-medium mt-1">${purchase.amount}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <div className="text-muted-foreground">Channel URL</div>
                                          <div className="font-medium truncate">{purchase.channel_url || 'Not provided'}</div>
                                        </div>
                                        <div>
                                          <div className="text-muted-foreground">Manager</div>
                                          <div className="font-medium">{purchase.assigned_manager || 'Not assigned'}</div>
                                        </div>
                                      </div>

                                      {purchase.seo_plans?.features && (
                                        <div>
                                          <div className="text-muted-foreground text-sm mb-2">Features</div>
                                          <div className="flex flex-wrap gap-1">
                                            {purchase.seo_plans.features.map((feature: string, index: number) => (
                                              <Badge key={index} variant="outline" className="text-xs">
                                                {feature}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Live SEO Analytics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Live SEO Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-700">
                          <strong>Note:</strong> This shows the exact same SEO analytics data that this client sees in their dashboard.
                        </p>
                      </div>
                      <UserSEOAnalyticsView userId={client.id} />
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="message" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Send Message to Client</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="messageTitle">Title</Label>
                    <Input
                      id="messageTitle"
                      placeholder="Message title..."
                      value={messageTitle}
                      onChange={(e) => setMessageTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="messageContent">Message</Label>
                    <Textarea
                      id="messageContent"
                      placeholder="Type your message here..."
                      rows={6}
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSendMessage} disabled={sending} className="w-full">
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Add Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="activityText">Activity</Label>
                    <Textarea
                      id="activityText"
                      placeholder="Describe the activity..."
                      rows={3}
                      value={activityText}
                      onChange={(e) => setActivityText(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAddActivity} disabled={sending} className="w-full">
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Activity"
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActivities.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No activities recorded yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {recentActivities.map((activity) => (
                        <div key={activity.id} className="border-l-2 pl-3 py-2">
                          <p className="text-sm">{activity.activity_text}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.activity_date).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PartnerClientDetailsModal;
