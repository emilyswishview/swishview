import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CampaignActions from "./CampaignActions";
import {
  Play,
  Eye,
  TrendingUp,
  Calendar,
  DollarSign,
  CreditCard,
  Target,
  Edit,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

// ✅ YouTube Thumbnail
const YouTubeThumbnail = ({ videoUrl, className }: { videoUrl: string; className?: string }) => {
  const getId = (url: string) => {
    const match = url.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  };
  const id = getId(videoUrl);
  return id ? (
    <img
      src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
      alt="YouTube Thumbnail"
      className={className}
    />
  ) : (
    <div className="w-full h-40 bg-gray-200 flex items-center justify-center rounded-xl">
      <Play className="h-8 w-8 text-gray-400" />
    </div>
  );
};

// ✅ Utility helpers
const calculateViewsGained = (current: number, start: number) => Math.max(current - start, 0);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

interface Campaign {
  id: string;
  title: string;
  youtube_video_url: string;
  target_views: number;
  current_views: number;
  budget: number;
  status: string;
  created_at: string;
  campaign_duration: number;
  starting_views?: number;
  target_audience?: string;
  last_view_update?: string;
  video_url?: string;
}

interface CampaignsListProps {
  campaigns: Campaign[];
  onRefreshViews: () => void;
  onRefreshAll: () => void;
  loading?: boolean;
}

const CampaignsList = ({ campaigns, onRefreshViews, onRefreshAll, loading = false }: CampaignsListProps) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { label: "Active", variant: "default" as const },
      pending: { label: "Pending", variant: "secondary" as const },
      completed: { label: "Completed", variant: "default" as const },
      paused: { label: "Paused", variant: "destructive" as const }
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getProgressPercentage = (viewsGained: number, target: number) => {
    // If target is 0, consider it 100% complete
    if (target === 0) return 100;
    return target > 0 ? Math.min((viewsGained / target) * 100, 100) : 0;
  };

  const handleEditCampaign = (campaign: Campaign) => {
    navigate(`/edit-campaign/${campaign.id}`);
  };

  const fetchCampaigns = () => {
    onRefreshAll();
  };

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Create your first campaign to start promoting your videos and reaching new audiences
        </p>
        <Button
          onClick={() => navigate("/create-promotion")}
          className="bg-primary hover:bg-primary/90 rounded-full px-8 py-3"
        >
          Create Your First Promotion
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Button
          onClick={() => navigate("/create-promotion")}
          className="bg-primary hover:bg-primary/90 rounded-full px-6 sm:px-8 py-3 text-sm"
        >
          <span className="mr-2">+</span>
          Create New Promotion
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onRefreshViews} disabled={loading} size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
            ) : (
              <Eye className="w-4 h-4 mr-1 sm:mr-2" />
            )}
            Refresh Views
          </Button>
        </div>
      </div>

      {/* Campaign Cards */}
      <div className="grid gap-8">
        {campaigns.map((campaign) => {
          const viewsGained = calculateViewsGained(campaign.current_views || 0, campaign.starting_views || 0);
          const goalTotal = (campaign.starting_views || 0) + (campaign.target_views || 0);
          const isCompleted = campaign.status === "completed" || 
            (goalTotal > 0 && (campaign.current_views || 0) >= goalTotal) ||
            (campaign.target_views === 0 && viewsGained > 0);
          const derivedStatus = isCompleted
            ? "completed"
            : (campaign.status === "pending" ? "pending" : "active");
          const isLocked = derivedStatus === "pending";

          return (
            <Card
              key={campaign.id}
              className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm hover:shadow-elegant-hover transition-all duration-300"
            >
              <CardContent className="p-4 sm:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* ✅ Thumbnail (always visible) */}
                  <div className="lg:col-span-3">
                    <div className="relative rounded-xl overflow-hidden">
                      <YouTubeThumbnail videoUrl={campaign.youtube_video_url || campaign.video_url || ""} className="w-full h-40 object-cover" />
                      <div className="absolute top-3 right-3">{getStatusBadge(derivedStatus)}</div>
                    </div>
                  </div>

                  {/* ✅ Campaign Details */}
                  <div className="lg:col-span-6 space-y-6">
                    {/* Title + Audience (always visible) */}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{campaign.title}</h3>
                      <p className="text-gray-600">{campaign.target_audience || "General Audience"}</p>
                    </div>

                    {/* Analytics Section (blur if locked) */}
                    <div className="relative">
                      <div className={`${isLocked ? "blur-sm pointer-events-none select-none" : ""}`}>
                        <div className="space-y-4 bg-gradient-to-r from-gray-50 to-white p-4 rounded-xl border border-gray-100">
                          <h4 className="font-semibold text-gray-800 flex items-center">
                            <Eye className="h-4 w-4 mr-2" />
                            YouTube View Tracking
                            {derivedStatus === "active" && (
                              <div className="ml-auto flex items-center text-green-600 text-xs">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                                Live
                              </div>
                            )}
                          </h4>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Starting views</p>
                              <p className="font-bold text-gray-900 text-lg">
                                {(campaign.starting_views || 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Current views</p>
                              <p className="font-bold text-gray-900 text-lg">
                                {(campaign.current_views || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Views Gained</span>
                              <span className="text-sm font-bold text-green-600">
                                +{calculateViewsGained(campaign.current_views || 0, campaign.starting_views || 0).toLocaleString()}{" "}
                                / {campaign.target_views?.toLocaleString()}
                              </span>
                            </div>
                            <Progress
                              value={getProgressPercentage(
                                calculateViewsGained(campaign.current_views || 0, campaign.starting_views || 0),
                                campaign.target_views
                              )}
                              className="h-3 bg-gray-100"
                            />
                            <div className="text-xs text-gray-500">
                              {isCompleted ? (
                                <span className="text-green-600 font-semibold">Campaign Completed</span>
                              ) : (
                                `${getProgressPercentage(
                                  calculateViewsGained(campaign.current_views || 0, campaign.starting_views || 0),
                                  campaign.target_views
                                ).toFixed(1)}% complete`
                              )}
                            </div>
                          </div>

                          {campaign.last_view_update && (
                            <div className="text-xs text-gray-400">
                              Last updated: {new Date(campaign.last_view_update).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ✅ Lock overlay (always visible, not blurred) */}
                      {isLocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-xl">
                      <div className="flex justify-center">
                        <div className="max-w-md w-full bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl p-6 text-center shadow-lg">
                          <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCard className="h-8 w-8 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-orange-800 mb-2">
                            Payment Required
                          </h3>
                          <p className="text-sm text-orange-700 mb-4">
                            Complete payment to activate your campaign and start gaining views
                          </p>
                          <Button
                            onClick={() => navigate(`/payment/${campaign.id}`)}
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full font-medium py-3 px-6 shadow-md hover:shadow-lg transition-all duration-300"
                            size="lg"
                          >
                            Complete Payment
                          </Button>
                        </div>
                      </div>
                        </div>
                      )}
                    </div>

                    {/* Metrics (blur if locked) */}
                    <div className={`${isLocked ? "blur-sm pointer-events-none select-none" : ""} grid grid-cols-2 lg:grid-cols-2 gap-4`}>
                      <div className="text-center p-3 bg-gray-50/50 rounded-xl">
                        <Calendar className="h-4 w-4 text-gray-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Start Date</p>
                        <p className="font-semibold text-gray-900 text-sm">{formatDate(campaign.created_at)}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50/50 rounded-xl">
                        <Target className="h-4 w-4 text-gray-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Target Views</p>
                        <p className="font-semibold text-gray-900 text-sm">{campaign.target_views?.toLocaleString()}</p>
                      </div>
                      {/* <div className="text-center p-3 bg-gray-50/50 rounded-xl">
                        <DollarSign className="h-4 w-4 text-gray-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Total Paid</p>
                        <p className="font-semibold text-gray-900 text-sm">${campaign.budget}</p>
                      </div> */}
                    </div>
                  </div>

                  {/* Actions (not blurred) */}
                  <div className="lg:col-span-3 flex flex-row lg:flex-col items-center lg:items-end gap-2 lg:space-y-4 pt-2 lg:pt-0">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCampaign(campaign)}
                        className="rounded-full border-gray-300 hover:border-orange-500 hover:text-orange-500 text-xs sm:text-sm"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Edit
                      </Button>
                      <CampaignActions campaign={campaign} onCampaignUpdated={fetchCampaigns} onEditClick={() => handleEditCampaign(campaign)} />
                    </div>

                    {derivedStatus === "active" && (
                      <div className="flex items-center text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Campaign Active
                      </div>
                    )}
                    {/* Only show target reached if views gained actually meet or exceed target */}
                    {calculateViewsGained(campaign.current_views || 0, campaign.starting_views || 0) >= campaign.target_views && (
                      <div className="flex items-center text-blue-600 text-sm">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Target Reached!
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CampaignsList;
