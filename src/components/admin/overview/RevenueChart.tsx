
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface ChartData {
  date: string;
  subscribers: number;
  messages: number;
  campaigns: number;
  revenue: number;
}

interface RevenueChartProps {
  data: ChartData[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(262.1 83.3% 57.8%)",
    },
    messages: {
      label: "Messages",
      color: "hsl(var(--secondary))",
    },
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg lg:text-xl">Daily Revenue</CardTitle>
        <CardDescription className="text-sm">Revenue and messages per day</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] lg:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="revenue" 
                fill="var(--color-revenue)" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="messages" 
                fill="var(--color-messages)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
