import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Upload, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  id: string;
  name: string;
  email: string;
  qr_code: string;
  day: number;
  entrance: boolean;
  lunch: boolean;
  dinner: boolean;
}

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [spotRegOpen, setSpotRegOpen] = useState(false);
  const [spotName, setSpotName] = useState('');
  const [spotEmail, setSpotEmail] = useState('');
  const [spotDay, setSpotDay] = useState('2');
  const [generatedQR, setGeneratedQR] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const { toast } = useToast();

  const ADMIN_PASSWORD = 'admin123'; // Demo password

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setUsers(data);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchUsers();
    }
  }, [authenticated]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      toast({
        title: 'Success',
        description: 'Logged in successfully',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Invalid password',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      for (const row of json as any[]) {
        const qrCode = `EVENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await supabase.from('users').insert({
          name: row.name || row.Name,
          email: row.email || row.Email,
          day: parseInt(row.day || row.Day) || 1,
          qr_code: qrCode,
        });
      }

      toast({
        title: 'Success',
        description: `Imported ${json.length} participants`,
      });

      fetchUsers();
    };

    reader.readAsBinaryString(file);
  };

  const handleExport = async () => {
    const worksheet = XLSX.utils.json_to_sheet(
      users.map(u => ({
        Name: u.name,
        Email: u.email,
        Day: u.day,
        'QR Code': u.qr_code,
        Entrance: u.entrance ? 'Yes' : 'No',
        Lunch: u.lunch ? 'Yes' : 'No',
        Dinner: u.dinner ? 'Yes' : 'No',
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    XLSX.writeFile(workbook, 'event-checkins.xlsx');

    toast({
      title: 'Success',
      description: 'Data exported successfully',
    });
  };

  const downloadQRCode = async (qrCode: string, name: string) => {
    try {
      const url = await QRCode.toDataURL(qrCode);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name.replace(/\s/g, '-')}-QR.png`;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSpotRegistration = async () => {
    if (!spotName.trim() || !spotEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    const qrCode = `EVENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { error } = await supabase.from('users').insert({
      name: spotName,
      email: spotEmail,
      day: parseInt(spotDay),
      qr_code: qrCode,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to register participant',
        variant: 'destructive',
      });
      return;
    }

    // Generate QR code image
    const url = await QRCode.toDataURL(qrCode, { width: 400 });
    setQrDataUrl(url);
    setGeneratedQR(qrCode);

    toast({
      title: 'Success!',
      description: 'Participant registered. QR code generated.',
    });

    fetchUsers();
  };

  const handleCloseSpotReg = () => {
    setSpotRegOpen(false);
    setSpotName('');
    setSpotEmail('');
    setSpotDay('2');
    setGeneratedQR('');
    setQrDataUrl('');
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Enter password to continue</p>
          </div>

          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-primary">Admin Dashboard</h1>
          <Button variant="outline" onClick={() => setAuthenticated(false)}>
            Logout
          </Button>
        </div>

        {/* Actions */}
        <Card className="p-6">
          <div className="flex gap-4 flex-wrap">
            <Dialog open={spotRegOpen} onOpenChange={setSpotRegOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Spot Registration
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Spot Registration</DialogTitle>
                </DialogHeader>
                {!generatedQR ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Participant name"
                        value={spotName}
                        onChange={(e) => setSpotName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="participant@email.com"
                        value={spotEmail}
                        onChange={(e) => setSpotEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="day">Day</Label>
                      <Select value={spotDay} onValueChange={setSpotDay}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Day 1</SelectItem>
                          <SelectItem value="2">Day 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleSpotRegistration} className="w-full">
                      Generate QR Code
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 text-center">
                    <p className="text-lg font-semibold text-primary">{spotName}</p>
                    <p className="text-sm text-muted-foreground">Day {spotDay}</p>
                    <div className="bg-background p-4 rounded-lg">
                      <img src={qrDataUrl} alt="QR Code" className="mx-auto" />
                    </div>
                    <p className="text-xs text-muted-foreground break-all">{generatedQR}</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => downloadQRCode(generatedQR, spotName)}
                        className="flex-1"
                      >
                        Download QR
                      </Button>
                      <Button
                        onClick={handleCloseSpotReg}
                        variant="outline"
                        className="flex-1"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Button asChild>
              <label className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Upload Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </Button>
            <Button onClick={handleExport} variant="secondary">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="text-2xl font-bold text-primary">{users.length}</div>
            <div className="text-sm text-muted-foreground">Total Participants</div>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold text-primary">
              {users.filter(u => u.entrance).length}
            </div>
            <div className="text-sm text-muted-foreground">Entrance Check-ins</div>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold text-primary">
              {users.filter(u => u.lunch).length}
            </div>
            <div className="text-sm text-muted-foreground">Lunch Check-ins</div>
          </Card>
          <Card className="p-6">
            <div className="text-2xl font-bold text-primary">
              {users.filter(u => u.dinner).length}
            </div>
            <div className="text-sm text-muted-foreground">Dinner Check-ins</div>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-primary mb-4">Participants</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Entrance</TableHead>
                  <TableHead>Lunch</TableHead>
                  <TableHead>Dinner</TableHead>
                  <TableHead>QR Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.day}</TableCell>
                    <TableCell>{user.entrance ? '✓' : '✗'}</TableCell>
                    <TableCell>{user.lunch ? '✓' : '✗'}</TableCell>
                    <TableCell>{user.dinner ? '✓' : '✗'}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadQRCode(user.qr_code, user.name)}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}