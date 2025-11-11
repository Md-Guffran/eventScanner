import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  day1Total: number;
  day1Entrance: number;
  day1Lunch: number;
  day1Dinner: number;
  day2Total: number;
  day2Entrance: number;
  day2Lunch: number;
}

export const LiveStats = () => {
  const [stats, setStats] = useState<Stats>({
    day1Total: 0,
    day1Entrance: 0,
    day1Lunch: 0,
    day1Dinner: 0,
    day2Total: 0,
    day2Entrance: 0,
    day2Lunch: 0,
  });

  const fetchStats = async () => {
    const { data: users } = await supabase
      .from('users')
      .select('*');

    if (users) {
      const day1Users = users.filter(u => u.day === 1);
      const day2Users = users.filter(u => u.day === 2);

      setStats({
        day1Total: day1Users.length,
        day1Entrance: day1Users.filter(u => u.entrance).length,
        day1Lunch: day1Users.filter(u => u.lunch).length,
        day1Dinner: day1Users.filter(u => u.dinner).length,
        day2Total: day2Users.length,
        day2Entrance: day2Users.filter(u => u.entrance).length,
        day2Lunch: day2Users.filter(u => u.lunch).length,
      });
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('stats-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="p-6 border-primary/30">
      <h3 className="text-lg font-semibold mb-4 text-primary">📊 Live Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Day 1</h4>
          <div className="space-y-1 text-sm">
            <div>Total: <span className="text-primary font-semibold">{stats.day1Total}</span></div>
            <div>Entrance: {stats.day1Entrance}</div>
            <div>Lunch: {stats.day1Lunch}</div>
            <div>Dinner: {stats.day1Dinner}</div>
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Day 2</h4>
          <div className="space-y-1 text-sm">
            <div>Total: <span className="text-primary font-semibold">{stats.day2Total}</span></div>
            <div>Entrance: {stats.day2Entrance}</div>
            <div>Lunch: {stats.day2Lunch}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};