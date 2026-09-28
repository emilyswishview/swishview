
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface ChartData {
  date: string;
  subscribers: number;
  messages: number;
  campaigns: number;
  revenue: number;
}

interface GrowthChartProps {
  data: ChartData[];
}

const GrowthChart: React.FC<GrowthChartProps> = ({ data }) => {
  const chartConfig = {
    subscribers: {
      label: "Subscribers",
      color: "hsl(var(--primary))",
    },
    campaigns: {
      label: "Campaigns",
      color: "hsl(142.1 76.2% 36.3%)",
    },
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg lg:text-xl">Growth Metrics</CardTitle>
        <CardDescription className="text-sm">Daily activity over the last week</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] lg:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="subscribers" 
                stroke="var(--color-subscribers)" 
                strokeWidth={2}
                dot={{ fill: "var(--color-subscribers)", r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="campaigns" 
                stroke="var(--color-campaigns)" 
                strokeWidth={2}
                dot={{ fill: "var(--color-campaigns)", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default GrowthChart;
