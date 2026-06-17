import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { 
  Eye, 
  DollarSign, 
  Target, 
  TrendingUp, 
  Calendar,
  PlayCircle,
  CheckCircle,
  Clock,
  BarChart3
} from "lucide-react";

interface DashboardAnalyticsProps {
  campaigns: any[];
  user: any;
}

const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({ campaigns, user }) => {
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  
  useEffect(() => {
    if (campaigns.length > 0) {
      const chartData = campaigns.map((campaign, index) => ({
        name: campaign.title.substring(0, 20) + (campaign.title.length > 20 ? '...' : ''),
        viewsGained: (campaign.current_views || 0) - (campaign.starting_views || 0),
        currentViews: campaign.current_views || 0,
        startingViews: campaign.starting_views || 0,
        target: campaign.target_views || 0,
        spent: campaign.budget || 0,
        date: new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));
      setAnalyticsData(chartData);
    }
  }, [campaigns]);

  // Calculate KPIs with enhanced view tracking
  const totalCampaigns = campaigns.length;
  const totalViewsGained = campaigns.reduce((sum, campaign) => {
    const gained = (campaign.current_views || 0) - (campaign.starting_views || 0);
    return sum + Math.max(0, gained);
  }, 0);
  const totalSpent = campaigns.reduce((sum, campaign) => sum + (campaign.budget || 0), 0);
  
  // Fix active/completed campaign counts based on actual campaign status
  const activeCampaigns = campaigns.filter(c => 
    c.status === 'active' || c.status === 'pending' || c.status === 'running' || c.status === 'processing'
  ).length;
  const completedCampaigns = campaigns.filter(c => 
    c.status === 'completed' || c.status === 'finished' || c.status === 'ended'
  ).length;
  
  // Calculate campaigns that actually reached their target (not just completed)
  const campaignsReachedTarget = campaigns.filter(c => {
    const viewsGained = Math.max(0, (c.current_views || 0) - (c.starting_views || 0));
    return viewsGained >= (c.target_views || 0);
  }).length;
  
  const averageViewsGained = totalCampaigns > 0 ? Math.round(totalViewsGained / totalCampaigns) : 0;

  const chartConfig = {
    viewsGained: {
      label: "Views Gained",
      color: "#f97316",
    },
    target: {
      label: "Target Views",
      color: "#e5e7eb",
    },
    spent: {
      label: "Amount Spent",
      color: "#10b981",
    },
  };

  return (
    <div className="space-y-8" style={{ paddingTop: '0px' }}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-gray-900 mb-4">
          Campaign Analytics
        </h2>
        <p className="text-lg font-display text-gray-600 max-w-2xl mx-auto">
          Track your video promotion performance with detailed insights and real YouTube view metrics
        </p>
      </div>

      {/* Enhanced KPI Cards with Real View Tracking */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 font-display">Total Campaigns</p>
                <p className="text-3xl font-bold text-gray-900 font-display">{totalCampaigns}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <PlayCircle className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">{totalCampaigns - campaignsReachedTarget} active</span>
              <span className="text-gray-500 ml-2">• {campaignsReachedTarget} completed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 font-display">Real Views Gained</p>
                <p className="text-3xl font-bold text-gray-900 font-display">{totalViewsGained.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                <Eye className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">{averageViewsGained.toLocaleString()} avg gained per campaign</span>
            </div>
          </CardContent>
        </Card>
{/* 
        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 font-display">Total Investment</p>
                <p className="text-3xl font-bold text-gray-900 font-display">${totalSpent.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Target className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-blue-600 font-medium">
                ${totalViewsGained > 0 ? (totalSpent / totalViewsGained).toFixed(4) : '0.0000'} per view gained
              </span>
            </div>
          </CardContent>
        </Card> */}

        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 font-display">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900 font-display">
                  {totalCampaigns > 0 ? Math.round((campaignsReachedTarget / totalCampaigns) * 100) : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Clock className="h-4 w-4 text-gray-500 mr-1" />
              <span className="text-gray-600 font-medium">{campaignsReachedTarget} campaigns reached target</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts with Real View Data */}
      {analyticsData.length > 0 && (
        <div className="w-full">
          {/* Views Performance Chart - Now shows actual gains */}
          <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm w-full">
            <CardHeader className="p-6">
              <CardTitle className="text-xl font-display font-bold text-gray-900">Real YouTube Views Performance</CardTitle>
              <CardDescription className="font-display text-gray-600">
                Track actual views gained from YouTube vs targets across campaigns
              </CardDescription>
            </CardHeader>
          
            <CardContent className="p-6 pt-0 w-full">
              <ChartContainer config={chartConfig} className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                    <XAxis 
                      dataKey="name" 
                      className="text-xs fill-gray-600"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis className="text-xs fill-gray-600" tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="viewsGained" 
                      stroke={chartConfig.viewsGained.color}
                      strokeWidth={3}
                      dot={{ fill: chartConfig.viewsGained.color, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: chartConfig.viewsGained.color, strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="target" 
                      stroke={chartConfig.target.color}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: chartConfig.target.color, strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Performance Details Table */}
      {analyticsData.length > 0 && (
        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm">
          <CardHeader className="p-6">
            <CardTitle className="text-xl font-display font-bold text-gray-900">Campaign Performance Details</CardTitle>
            <CardDescription className="font-display text-gray-600">
              Detailed breakdown of each campaign's YouTube view performance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-display font-semibold text-gray-700">Campaign</th>
                    <th className="text-right p-3 font-display font-semibold text-gray-700">Starting Views</th>
                    <th className="text-right p-3 font-display font-semibold text-gray-700">Current Views</th>
                    <th className="text-right p-3 font-display font-semibold text-gray-700">Views Gained</th>
                    <th className="text-right p-3 font-display font-semibold text-gray-700">Target</th>
                    <th className="text-right p-3 font-display font-semibold text-gray-700">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign, index) => {
                    const viewsGained = Math.max(0, (campaign.current_views || 0) - (campaign.starting_views || 0));
                    const progress = campaign.target_views > 0 ? (viewsGained / campaign.target_views) * 100 : 0;
                    
                    return (
                      <tr key={campaign.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="p-3 font-display font-medium text-gray-900">{campaign.title}</td>
                        <td className="p-3 text-right font-display text-gray-600">
                          {(campaign.starting_views || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-display text-gray-900 font-semibold">
                          {(campaign.current_views || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-display text-green-600 font-bold">
                          +{viewsGained.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-display text-gray-600">
                          {(campaign.target_views || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-display">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            progress >= 100 
                              ? 'bg-green-100 text-green-800' 
                              : progress >= 50 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {progress.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {analyticsData.length === 0 && (
        <Card className="border-0 shadow-elegant bg-white/70 backdrop-blur-sm text-center py-16">
          <CardContent>
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
              <BarChart3 className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-display font-semibold text-gray-900 mb-4">
              No Analytics Data Yet
            </h3>
            <p className="text-lg font-display text-gray-600 max-w-md mx-auto">
              Create and run campaigns to see detailed performance analytics with real YouTube view tracking
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardAnalytics;
