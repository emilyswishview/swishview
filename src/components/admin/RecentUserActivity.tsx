import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Eye, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  userId: string;
}

interface ActivityItem {
  id: string;
  title: string;
  current_views: number;
  starting_views: number | null;
  target_views: number;
  status: string;
  created_at: string;
}

const RecentUserActivity = ({ userId }: Props) => {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('promotions')
          .select('id, title, current_views, starting_views, target_views, status, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
        setItems(data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading recent activity…</div>;
  if (items.length === 0) return <div className="text-sm text-muted-foreground">No recent campaign activity.</div>;

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const gained = Math.max(0, (item.current_views || 0) - (item.starting_views || 0));
        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50/60 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <PlayCircle className="h-4 w-4 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  Started {format(new Date(item.created_at), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-gray-600">
                <Eye className="h-3 w-3" /> {item.current_views.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <TrendingUp className="h-3 w-3" /> +{gained.toLocaleString()}
              </span>
              <Badge variant="outline" className="capitalize text-xs">
                {item.status}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RecentUserActivity;
