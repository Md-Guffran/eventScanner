import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
  const [error, setError] = useState<string>('');

  const handleScan = (result: any) => {
    if (result && result[0]?.rawValue) {
      onScan(result[0].rawValue);
    }
  };

  const handleError = (err: any) => {
    console.error('QR Scanner error:', err);
    setError('Failed to access camera. Please ensure camera permissions are granted.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-md p-6 border-2 border-primary glow-primary">
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary mb-2">Scan QR Code</h2>
            <p className="text-sm text-muted-foreground">Align the QR code inside the frame</p>
          </div>

          <div className="relative rounded-lg overflow-hidden border-4 border-primary/50">
            <Scanner
              onScan={handleScan}
              onError={handleError}
              constraints={{
                facingMode: 'environment'
              }}
              styles={{
                container: {
                  width: '100%',
                  paddingTop: '100%',
                  position: 'relative'
                },
                video: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }
              }}
            />
            <div className="absolute inset-0 border-4 border-primary animate-pulse pointer-events-none" />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
};