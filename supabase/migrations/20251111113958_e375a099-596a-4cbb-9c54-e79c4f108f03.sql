-- Create users table for event participants
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  day INTEGER NOT NULL CHECK (day IN (1, 2)),
  entrance BOOLEAN NOT NULL DEFAULT false,
  lunch BOOLEAN NOT NULL DEFAULT false,
  dinner BOOLEAN NOT NULL DEFAULT false,
  type TEXT NOT NULL CHECK (type IN ('alumni', 'faculty')), -- Added type column
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checkins table to track all check-in events
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entrance', 'lunch', 'dinner')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (for QR scanning and stats)
CREATE POLICY "Allow public read access to users"
ON public.users
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert to users"
ON public.users
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update to users"
ON public.users
FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public read access to checkins"
ON public.checkins
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert to checkins"
ON public.checkins
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_users_qr_code ON public.users(qr_code);
CREATE INDEX idx_users_day ON public.users(day);
CREATE INDEX idx_users_type ON public.users(type); -- Index for type column
CREATE INDEX idx_checkins_user_id ON public.checkins(user_id);
CREATE INDEX idx_checkins_type ON public.checkins(type);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkins;