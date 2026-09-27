import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Eye, BarChart3, Plus } from "lucide-react";
import UserAnalyticsModal from "@/components/admin/UserAnalyticsModal";
import ChannelAnalytics from "@/components/ChannelAnalytics";
import CampaignForm from "@/components/CampaignForm";
import { toast } from "sonner";

interface Client {
  id: string;
  email: string;
  full_name: string | null;
  channel_url: string | null;
  channel_name: string | null;
  assigned_at: string;
}

interface PartnerClientCardProps {
  client: Client;
}

const PartnerClientCard = ({ client }: PartnerClientCardProps) => {
  const [showUserAnalytics, setShowUserAnalytics] = useState(false);
  const [showChannelAnalytics, setShowChannelAnalytics] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);

  const handleCreateCampaign = () => {
    setShowCreateCampaign(true);
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4" />
              {client.full_name || client.email}
            </CardTitle>
            {client.channel_name && (
              <Badge variant="secondary" className="text-xs">
                {client.channel_name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium">{client.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Assigned:</span>
              <p className="font-medium">
                {new Date(client.assigned_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUserAnalytics(true)}
              className="rounded-full hover:bg-primary/10 hover:border-primary text-primary hover:text-primary"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChannelAnalytics(true)}
              className="rounded-full hover:bg-blue-50 hover:border-blue-200 text-blue-600 hover:text-blue-700"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateCampaign}
              className="rounded-full hover:bg-green-50 hover:border-green-200 text-green-600 hover:text-green-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Analytics Modal */}
      <Dialog open={showUserAnalytics} onOpenChange={setShowUserAnalytics}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Eye className="h-5 w-5" />
              User Analytics - {client.full_name || client.email}
            </DialogTitle>
            <DialogDescription className="font-display">
              Complete overview of user's campaign and SEO data
            </DialogDescription>
          </DialogHeader>
          <UserAnalyticsModal 
            user={{
              id: client.id,
              email: client.email,
              full_name: client.full_name || '',
              role: 'user',
              created_at: client.assigned_at,
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Channel Analytics Modal */}
      <Dialog open={showChannelAnalytics} onOpenChange={setShowChannelAnalytics}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <BarChart3 className="h-5 w-5" />
              Channel Analytics - {client.full_name || client.email}
            </DialogTitle>
            <DialogDescription className="font-display">
              View channel growth analytics for this client
            </DialogDescription>
          </DialogHeader>
          <ChannelAnalytics userId={client.id} />
        </DialogContent>
      </Dialog>

      {/* Create Campaign Modal */}
      <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Plus className="h-5 w-5" />
              Create Campaign for {client.full_name || client.email}
            </DialogTitle>
            <DialogDescription className="font-display">
              Set up a new promotion campaign for this client
            </DialogDescription>
          </DialogHeader>
          <CampaignForm 
            targetUserId={client.id}
            onSuccess={() => {
              setShowCreateCampaign(false);
              toast.success("Campaign created successfully!");
            }}
            onCancel={() => setShowCreateCampaign(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PartnerClientCard;
