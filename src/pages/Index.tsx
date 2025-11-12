import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QRScanner } from '@/components/QRScanner';

const Index = () => {
  const [showScanner, setShowScanner] = useState(false);
  const navigate = useNavigate();

  const handleScan = (data: string) => {
    setShowScanner(false);
    navigate(`/dashboard/${data}`);
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-slide-up">
        <Card className="p-8 md:p-12 text-center border-2 border-primary/50 glow-primary">
          <div className="space-y-6">
            {/* Logo/Icon */}
            <div className="text-6xl mb-4">🎫</div>
            
            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 text-white">
              Event Check-In
            </h1>
            <p className="text-xl text-muted-foreground mb-8 text-white">
              Scan your QR code to check in and track your event progress
            </p>

            {/* Main CTA */}
            <Button
              size="lg"
              onClick={() => setShowScanner(true)}
              className="text-lg px-8 py-6 glow-primary hover:scale-105 transition-transform text-white bg-color-#E7E7E7"
            >
              🔍 Scan QR to Check In
            </Button>

            {/* Feature Points */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 text-sm text-muted-foreground">
              <div className="space-y-2">
                <div className="text-2xl"></div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl"></div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl"></div>
              </div>
            </div>

            {/* Admin Link */}
            <div className="mt-8 pt-6 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
                className="text-muted-foreground hover:text-primary"
              >
                Admin Access
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default Index;
