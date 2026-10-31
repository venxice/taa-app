'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { getErrorMessage } from '@/lib/errors';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login({ username: username.trim(), password });
      toast.success('Welcome back!');
      const route =
        user.role === 'admin'
          ? '/admin/dashboard'
          : user.role === 'hoa_officer'
            ? '/hoa/dashboard'
            : '/resident/dashboard';
      router.push(route);
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid username or password'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Sign in to your Teremil Assistance account.
        </p>
      </div>

      {error && <Alert className="mb-4">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="username">Username or Email</Label>
          <Input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:text-slate-700 active:scale-95"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          loading={loading}
          size="lg"
          className="mt-1 w-full h-12 text-base sm:h-11"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-brand-700 hover:underline">
          Register here
        </Link>
      </p>
    </div>
  );
}
