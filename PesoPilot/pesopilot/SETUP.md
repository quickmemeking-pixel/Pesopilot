# PesoPilot - Setup Guide

## Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Setup

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Note down your project URL and anon key from Settings > API

### 2. Configure Authentication
1. In your Supabase dashboard, go to Authentication > Settings
2. Enable Email provider
3. Configure email templates (optional)
4. Set Site URL to `http://localhost:3000` for development

### 3. Database Setup (Optional - for future features)
If you want to store user data, create the following tables:

```sql
-- Example: Transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  category TEXT,
  type TEXT CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can only access their own transactions"
  ON transactions FOR ALL
  USING (auth.uid() = user_id);
```

## Running the Application

### Development
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production
```bash
npm run build
npm start
```

## Features

- **Authentication**: Email/password login and signup
- **Protected Routes**: Dashboard accessible only to authenticated users
- **Dark Mode**: Toggle between light and dark themes
- **Peso Currency**: Filipino Peso formatting (₱) throughout the app
- **Mobile Responsive**: Works on all device sizes

## Project Structure

```
pesopilot/
├── src/
│   ├── app/
│   │   ├── actions.ts          # Server actions for auth
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Protected dashboard
│   │   ├── login/
│   │   │   └── page.tsx        # Login page
│   │   ├── signup/
│   │   │   └── page.tsx        # Signup page
│   │   ├── globals.css         # Global styles with dark mode
│   │   ├── layout.tsx          # Root layout with ThemeProvider
│   │   └── page.tsx            # Root redirect
│   ├── providers/
│   │   └── ThemeProvider.tsx   # Dark mode context
│   ├── utils/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser Supabase client
│   │   │   ├── server.ts       # Server Supabase client
│   │   │   └── middleware.ts   # Auth middleware
│   │   └── currency.ts         # Peso formatting utilities
│   └── middleware.ts           # Next.js middleware
├── .env.local.example          # Environment variables template
└── package.json
```

## Next Steps

1. Connect your Supabase credentials in `.env.local`
2. Run `npm run dev` to start the development server
3. Test authentication flow at `/login` and `/signup`
4. Access the protected dashboard at `/dashboard`
