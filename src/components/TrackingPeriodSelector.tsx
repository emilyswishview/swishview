import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";

interface TrackingPeriodSelectorProps {
  userId: string;
}

const TrackingPeriodSelector = ({ userId }: TrackingPeriodSelectorProps) => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchDateRange();
  }, [userId]);

  const fetchDateRange = async () => {
    try {
      const { data: manualEntries, error } = await supabase
        .from('seo_analytics_manual_entries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: true });

      if (error) throw error;

      if (manualEntries && manualEntries.length > 0) {
        const startDate = manualEntries.find(entry => entry.starting_date)?.starting_date || manualEntries[0]?.entry_date;
        const endDate = manualEntries[manualEntries.length - 1]?.entry_date;
        
        setDateRange({ start: startDate || '', end: endDate || '' });
      }
    } catch (error: any) {
      console.error('Failed to fetch date range:', error);
    }
  };

  if (!dateRange.start) return null;

  return (
    <Card className="bg-gradient-to-r from-blue-50 border-blue-200 ">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <Calendar className="w-4 h-4" />
          <span>Tracking period: {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackingPeriodSelector;