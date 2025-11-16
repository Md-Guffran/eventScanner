import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast, useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Upload, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ---------- 1. TYPES  ---------- */
interface User {
  id: string;
  name: string;
  email: string;
  qr_code: string;
  day: number;
  entrance: boolean;
  lunch: boolean;
  dinner: boolean;
  type: 'alumni' | 'faculty';
}

/* ---------- 2. COMPONENT  ---------- */
export default function Admin() {
  /* ----- AUTH & DATA ----- */
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  /* ----- QR STATE ----- */
  const [alumniCount, setAlumniCount] = useState(0);
  const [facultyCount, setFacultyCount] = useState(0);
  const [currentType, setCurrentType] = useState<'alumni' | 'faculty'>('alumni');

  /* ----- SPOT REG MODAL ----- */
  const [spotRegOpen, setSpotRegOpen] = useState(false);
  const [spotName, setSpotName] = useState('');
  const [spotEmail, setSpotEmail] = useState('');
  const [spotDay, setSpotDay] = useState<'1' | '2'>('2');
  const [generatedQR, setGeneratedQR] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const { toast } = useToast();
  const ADMIN_PASSWORD = 'admin123';

  /* ---------- 3. QR GENERATOR  ---------- */
  const generateQRCode = (type: 'alumni' | 'faculty'): string | null => {
    const prefix = type === 'alumni' ? 'AL' : 'FL';
    const count = type === 'alumni' ? alumniCount : facultyCount;

    if (count >= 999) {
      toast({
        title: 'Limit reached',
        description: `Maximum ${type} entries (999) reached.`,
        variant: 'destructive',
      });
      return null;
    }
    const next = count + 1;
    const code = `${prefix}-${String(next).padStart(3, '0')}`;

    type === 'alumni' ? setAlumniCount(next) : setFacultyCount(next);
    return code;
  };

  /* ---------- 4. DATA FETCH  ---------- */
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'DB error', description: error.message, variant: 'destructive' });
      return;
    }
    if (!data) return;

    setUsers(data as User[]);

    /* recount from DB to stay accurate */
    const al = data.filter((u: any) => u.type === 'alumni').length;
    const fa = data.filter((u: any) => u.type === 'faculty').length;
    setAlumniCount(al);
    setFacultyCount(fa);
  };

  useEffect(() => {
    if (authenticated) fetchUsers();
  }, [authenticated]);

  /* ---------- 5. LOGIN  ---------- */
  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      toast({ title: 'Logged in' });
    } else {
      toast({ title: 'Wrong password', variant: 'destructive' });
    }
  };

  /* ---------- 6. BULK IMPORT  ---------- */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      for (const r of rows) {
        const type: 'alumni' | 'faculty' = r.type === 'faculty' ? 'faculty' : 'alumni';
        const code = generateQRCode(type);
        if (!code) continue; // skip if limit reached

        await supabase.from('users').insert({
          name: r.name || r.Name,
          email: r.email || r.Email,
          day: Number(r.day || r.Day) || 1,
          qr_code: code,
          type,
          entrance: false,
          lunch: false,
          dinner: false,
        });
      }
      toast({ title: `Imported ${rows.length} rows` });
      fetchUsers();
    };
    reader.readAsBinaryString(file);
  };

  /* ---------- 7. EXPORT  ---------- */
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(
      users.map((u) => ({
        Name: u.name,
        Email: u.email,
        Day: u.day,
        'QR Code': u.qr_code,
        Type: u.type,
        Entrance: u.entrance ? 'Yes' : 'No',
        Lunch: u.lunch ? 'Yes' : 'No',
        Dinner: u.dinner ? 'Yes' : 'No',
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'event-checkins.xlsx');
    toast({ title: 'Exported' });
  };

  /* ---------- 8. QR DOWNLOAD  ---------- */
  const downloadQRCode = async (qrCode: string, name: string) => {
    try {
      const url = await QRCode.toDataURL(qrCode);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '-')}-QR.png`;
      a.click();
    } catch (e) {
      console.error(e);
    }
  };

  /* ---------- 9. SPOT REGISTRATION  ---------- */
  const handleSpotRegistration = async () => {
    if (!spotName.trim() || !spotEmail.trim()) {
      toast({ title: 'Name and email required', variant: 'destructive' });
      return;
    }
    const code = generateQRCode(currentType);
    if (!code) return;

    const { error } = await supabase.from('users').insert({
      name: spotName,
      email: spotEmail,
      day: Number(spotDay),
      qr_code: code,
      type: currentType,
      entrance: false,
      lunch: false,
      dinner: false,
    });

    if (error) {
      toast({ title: 'Insert failed', description: error.message, variant: 'destructive' });
      return;
    }

    setGeneratedQR(code);
    const url = await QRCode.toDataURL(code);
    setQrDataUrl(url);

    toast({ title: `${currentType} added` });
    setSpotName('');
    setSpotEmail('');
    fetchUsers();
  };

  /* ---------- 10. RENDER  ---------- */
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Card className="p-6 w-96">
          <h2 className="text-xl font-semibold mb-4">Admin Login</h2>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <Button className="w-full mt-4" onClick={handleLogin}>
            Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    // 👇👇👇  BLACK BACKGROUND  👇👇👇
    <div className="p-6 bg-black min-h-screen text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Event Admin</h1>

        {/* TYPE SELECTOR + CURRENT CODE */}
        <Card
          className="p-6 mb-6 text-white"
          style={{ backgroundColor: currentType === 'alumni' ? '#5C4E4E' : '#988686' }}
        >
          <div className="flex items-center gap-4">
            <Select value={currentType} onValueChange={(v) => setCurrentType(v as 'alumni' | 'faculty')}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alumni">Alumni</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto text-lg font-semibold">
              {currentType === 'alumni'
                ? `AL-${String(alumniCount + 1).padStart(3, '0')}`
                : `FL-${String(facultyCount + 1).padStart(3, '0')}`}
            </div>
          </div>
        </Card>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Dialog open={spotRegOpen} onOpenChange={setSpotRegOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Spot Registration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Spot Registration – {currentType}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label>Name</Label>
                  <Input value={spotName} onChange={(e) => setSpotName(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={spotEmail} onChange={(e) => setSpotEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Day</Label>
                  <Select value={spotDay} onValueChange={(v) => setSpotDay(v as '1' | '2')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Day 1</SelectItem>
                      <SelectItem value="2">Day 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSpotRegistration}>Generate & Save</Button>
                {generatedQR && (
                  <div className="text-center mt-4">
                    <p className="mb-2 font-semibold">{generatedQR}</p>
                    <img src={qrDataUrl} alt="QR" className="mx-auto" />
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>

          <Label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" hidden onChange={handleFileUpload} />
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
              <Upload className="h-4 w-4" />
              Import Excel
            </span>
          </Label>
        </div>

        {/* USERS TABLE */}
        <Card className="p-4 bg-gray-900">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-white">Name</TableHead>
                <TableHead className="text-white">Email</TableHead>
                <TableHead className="text-white">QR Code</TableHead>
                <TableHead className="text-white">Type</TableHead>
                <TableHead className="text-white">Day</TableHead>
                <TableHead className="text-white">Entrance</TableHead>
                <TableHead className="text-white">Lunch</TableHead>
                <TableHead className="text-white">Dinner</TableHead>
                <TableHead className="text-white text-right">Download QR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-white">{u.name}</TableCell>
                  <TableCell className="text-white">{u.email}</TableCell>
                  <TableCell className="font-mono text-white">{u.qr_code}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs text-white ${
                        u.type === 'alumni' ? 'bg-[#5C4E4E]' : 'bg-[#988686]'
                      }`}
                    >
                      {u.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-white">{u.day}</TableCell>
                  <TableCell className="text-white">{u.entrance ? '✅' : '❌'}</TableCell>
                  <TableCell className="text-white">{u.lunch ? '✅' : '❌'}</TableCell>
                  <TableCell className="text-white">{u.dinner ? '✅' : '❌'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => downloadQRCode(u.qr_code, u.name)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}