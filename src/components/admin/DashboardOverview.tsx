
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import KPICards from "./overview/KPICards";
import GrowthChart from "./overview/GrowthChart";
import RevenueChart from "./overview/RevenueChart";
import AdminNotificationBell from "../AdminNotificationBell";

interface DashboardStats {
  totalSubscribers: number;
  totalMessages: number;
  totalCampaigns: number;
  totalRevenue: number;
  newSubscribersToday: number;
  messagesLast7Days: number;
}

interface ChartData {
  date: string;
  subscribers: number;
  messages: number;
  campaigns: number;
  revenue: number;
}

const DashboardOverview = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSubscribers: 0,
    totalMessages: 0,
    totalCampaigns: 0,
    totalRevenue: 0,
    newSubscribersToday: 0,
    messagesLast7Days: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchDashboardData();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(profile?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch total counts
      const [subscribersResult, messagesResult, campaignsResult, paymentsResult] = await Promise.all([
        supabase.from("email_subscriptions").select("*", { count: "exact", head: true }),
        supabase.from("contact_messages").select("*", { count: "exact", head: true }),
        supabase.from("promotions").select("*", { count: "exact", head: true }),
        supabase.from("payments").select("amount, status"),
      ]);

      // Calculate total revenue from completed payments
      const totalRevenue = paymentsResult.data
        ?.filter(payment => payment.status === 'completed')
        .reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

      // Fetch today's new subscribers
      const today = new Date().toISOString().split('T')[0];
      const { count: newSubscribersToday } = await supabase
        .from("email_subscriptions")
        .select("*", { count: "exact", head: true })
        .gte("subscribed_at", `${today}T00:00:00Z`)
        .lte("subscribed_at", `${today}T23:59:59Z`);

      // Fetch messages from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: messagesLast7Days } = await supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      setStats({
        totalSubscribers: subscribersResult.count || 0,
        totalMessages: messagesResult.count || 0,
        totalCampaigns: campaignsResult.count || 0,
        totalRevenue,
        newSubscribersToday: newSubscribersToday || 0,
        messagesLast7Days: messagesLast7Days || 0,
      });

      // Generate chart data for the last 7 days
      const chartData: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const [daySubscribers, dayMessages, dayCampaigns, dayPayments] = await Promise.all([
          supabase
            .from("email_subscriptions")
            .select("*", { count: "exact", head: true })
            .gte("subscribed_at", `${dateStr}T00:00:00Z`)
            .lte("subscribed_at", `${dateStr}T23:59:59Z`),
          supabase
            .from("contact_messages")
            .select("*", { count: "exact", head: true })
            .gte("created_at", `${dateStr}T00:00:00Z`)
            .lte("created_at", `${dateStr}T23:59:59Z`),
          supabase
            .from("promotions")
            .select("*", { count: "exact", head: true })
            .gte("created_at", `${dateStr}T00:00:00Z`)
            .lte("created_at", `${dateStr}T23:59:59Z`),
          supabase
            .from("payments")
            .select("amount, status")
            .gte("created_at", `${dateStr}T00:00:00Z`)
            .lte("created_at", `${dateStr}T23:59:59Z`)
        ]);

        const dayRevenue = dayPayments.data
          ?.filter(payment => payment.status === 'completed')
          .reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

        chartData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          subscribers: daySubscribers.count || 0,
          messages: dayMessages.count || 0,
          campaigns: dayCampaigns.count || 0,
          revenue: dayRevenue,
        });
      }

      setChartData(chartData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 font-display">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Welcome to the admin control panel</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <AdminNotificationBell />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <KPICards stats={stats} loading={loading} />

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        <GrowthChart data={chartData} />
        <RevenueChart data={chartData} />
      </div>
    </div>
  );
};

export default DashboardOverview;
