import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckInCard } from '@/components/CheckInCard';
import { LiveStats } from '@/components/LiveStats';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

interface User {
  id: string;
  name: string;
  day: number;
  entrance: boolean;
  lunch: boolean;
  dinner: boolean;
}

export default function Dashboard() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ entrance: 0, lunch: 0, dinner: 0 });

  const fetchUser = async () => {
    if (!qrCode) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('qr_code', qrCode)
      .single();

    if (error || !data) {
      toast({
        title: 'Error',
        description: 'Invalid QR code',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    setUser(data);
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!user) return;

    const { data: users } = await supabase
      .from('users')
      .select('entrance, lunch, dinner')
      .eq('day', user.day);

    if (users) {
      setStats({
        entrance: users.filter(u => u.entrance).length,
        lunch: users.filter(u => u.lunch).length,
        dinner: users.filter(u => u.dinner).length,
      });
    }
  };

  const handleCheckIn = async (type: 'entrance' | 'lunch' | 'dinner') => {
    if (!user) return;

    // Check if this is the next valid step
    if (type === 'entrance' && user.entrance) return;
    if (type === 'lunch' && (!user.entrance || user.lunch)) return;
    if (type === 'dinner' && (!user.lunch || user.dinner || user.day === 2)) return;

    const { error } = await supabase
      .from('users')
      .update({ [type]: true })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to check in',
        variant: 'destructive',
      });
      return;
    }

    // Record check-in
    await supabase.from('checkins').insert({
      user_id: user.id,
      type,
    });

    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    toast({
      title: 'Success!',
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} check-in complete`,
    });

    fetchUser();
  };

  useEffect(() => {
    fetchUser();
  }, [qrCode]);

  useEffect(() => {
    if (user) {
      fetchStats();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('dashboard-updates')
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
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-primary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getNextStep = () => {
    if (!user.entrance) return 'entrance';
    if (!user.lunch) return 'lunch';
    if (!user.dinner && user.day === 1) return 'dinner';
    return null;
  };

  const nextStep = getNextStep();
  const isComplete = user.day === 1 
    ? user.entrance && user.lunch && user.dinner
    : user.entrance && user.lunch;

  return (
    <div className="min-h-screen gradient-bg p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Welcome, {user.name}!</h1>
          <p className="text-xl text-muted-foreground">Day {user.day} Check-In Progress</p>
        </div>

        {/* Check-in Cards */}
        <div className="space-y-4">
          <div onClick={() => !user.entrance && nextStep === 'entrance' && handleCheckIn('entrance')}>
            <CheckInCard
              icon="🏠"
              title="Entrance"
              status={user.entrance ? 'completed' : nextStep === 'entrance' ? 'pending' : 'locked'}
              count={stats.entrance}
              isActive={nextStep === 'entrance'}
            />
          </div>

          <div onClick={() => user.entrance && !user.lunch && nextStep === 'lunch' && handleCheckIn('lunch')}>
            <CheckInCard
              icon="🍱"
              title="Lunch"
              status={user.lunch ? 'completed' : nextStep === 'lunch' ? 'pending' : 'locked'}
              count={stats.lunch}
              isActive={nextStep === 'lunch'}
            />
          </div>

          {user.day === 1 && (
            <div onClick={() => user.lunch && !user.dinner && nextStep === 'dinner' && handleCheckIn('dinner')}>
              <CheckInCard
                icon="🍽️"
                title="Dinner"
                status={user.dinner ? 'completed' : nextStep === 'dinner' ? 'pending' : 'locked'}
                count={stats.dinner}
                isActive={nextStep === 'dinner'}
              />
            </div>
          )}
        </div>

        {/* Completion Message */}
        {isComplete && (
          <div className="text-center p-6 bg-success/20 border-2 border-success rounded-lg glow-success">
            <h2 className="text-2xl font-bold text-success mb-2">
              {user.day === 1 ? "🎉 Day 1 Complete!" : "✅ Event Complete!"}
            </h2>
            <p className="text-foreground">
              {user.day === 1 
                ? "You've completed all check-ins for Day 1. See you tomorrow!" 
                : "Thank you for attending! All check-ins completed."}
            </p>
          </div>
        )}

        {/* Live Stats */}
        <LiveStats />

        {/* Back Button */}
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="w-full"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
}