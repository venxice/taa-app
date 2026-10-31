'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errors';
import { isEmail, isUsername, isPhonePH, passwordIssue } from '@/lib/validation';

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  phone: string;
  address: string;
  householdRole: string;
  householdSize: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  phone: '',
  address: '',
  householdRole: '',
  householdSize: '',
};

const STEPS = ['Account', 'Residency'];

const HOUSEHOLD_ROLES = ['House Owner', 'Tenant', 'Relative', 'Boarder', 'Caretaker', 'Other'];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  }

  function validateStep(s: number): Errors {
    const next: Errors = {};
    if (s === 1) {
      if (!form.firstName.trim()) next.firstName = 'First name is required';
      if (!form.lastName.trim()) next.lastName = 'Last name is required';
      if (!form.username.trim()) next.username = 'Username is required';
      else if (!isUsername(form.username))
        next.username = '3-20 characters, letters, numbers, dot or underscore only';
      if (form.email && !isEmail(form.email)) next.email = 'Enter a valid email address';
      if (form.phone && !isPhonePH(form.phone))
        next.phone = 'Enter a valid PH number (e.g. 09171234567)';
      const pw = passwordIssue(form.password);
      if (pw) next.password = pw;
      if (!form.confirmPassword) next.confirmPassword = 'Please confirm your password';
      else if (form.password !== form.confirmPassword)
        next.confirmPassword = 'Passwords do not match';
    }
    if (s === 2) {
      if (!form.address.trim()) next.address = 'Please enter your complete home address';
      if (!form.householdRole) next.householdRole = 'Please select your role in the household';
      const size = Number(form.householdSize);
      if (!form.householdSize.trim() || Number.isNaN(size) || size < 1)
        next.householdSize = 'Enter how many people live in the household';
    }
    return next;
  }

  function goNext() {
    setFormError('');
    const found = validateStep(step);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }
    setStep((s) => Math.min(2, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    setFormError('');
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const found = { ...validateStep(1), ...validateStep(2) };
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || undefined,
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        username: form.username.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        householdRole: form.householdRole || undefined,
        householdSize: form.householdSize ? Number(form.householdSize) : undefined,
      });
      toast.success('Registration submitted! Your account is pending HOA verification.');
      router.push('/login');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          New accounts are verified by the HOA. Please provide your details.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-6 flex items-center">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={label} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition',
                    active && 'bg-brand-700 text-white',
                    done && 'bg-brand-100 text-brand-700',
                    !active && !done && 'bg-slate-100 text-slate-400'
                  )}
                >
                  {done ? <Check size={14} /> : n}
                </span>
                <span className={cn('text-xs font-medium', active ? 'text-slate-900' : 'text-slate-400')}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span className={cn('mx-2 h-px flex-1', step > n ? 'bg-brand-300' : 'bg-slate-200')} />
              )}
            </div>
          );
        })}
      </div>

      {formError && <Alert className="mb-4">{formError}</Alert>}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Step 1 — Account */}
        {step === 1 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First Name" required htmlFor="firstName" error={errors.firstName}>
                <Input
                  id="firstName"
                  value={form.firstName}
                  invalid={!!errors.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  placeholder="Juan"
                />
              </FormField>
              <FormField label="Middle Name" htmlFor="middleName" error={errors.middleName}>
                <Input
                  id="middleName"
                  value={form.middleName}
                  invalid={!!errors.middleName}
                  onChange={(e) => update('middleName', e.target.value)}
                  placeholder="Dela"
                />
              </FormField>
            </div>

            <FormField label="Last Name" required htmlFor="lastName" error={errors.lastName}>
              <Input
                id="lastName"
                value={form.lastName}
                invalid={!!errors.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                placeholder="Cruz"
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Email" htmlFor="email" error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  invalid={!!errors.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="juan@email.com"
                />
              </FormField>
              <FormField label="Contact Number" htmlFor="phone" error={errors.phone}>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  invalid={!!errors.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="09XX XXX XXXX"
                />
              </FormField>
            </div>

            <FormField
              label="Username"
              required
              htmlFor="username"
              error={errors.username}
              hint="3-20 characters. Letters, numbers, dot or underscore."
            >
              <Input
                id="username"
                value={form.username}
                invalid={!!errors.username}
                onChange={(e) => update('username', e.target.value)}
                placeholder="Choose a username"
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Password" required htmlFor="password" error={errors.password}>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    invalid={!!errors.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="Min. 8 characters"
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
              </FormField>
              <FormField
                label="Confirm Password"
                required
                htmlFor="confirmPassword"
                error={errors.confirmPassword}
              >
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    invalid={!!errors.confirmPassword}
                    onChange={(e) => update('confirmPassword', e.target.value)}
                    placeholder="Re-enter password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:text-slate-700 active:scale-95"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </FormField>
            </div>
          </>
        )}

        {/* Step 2 — Residency */}
        {step === 2 && (
          <>
            <FormField
              label="Home Address"
              required
              htmlFor="address"
              error={errors.address}
              hint="House no., street, purok/zone, barangay, municipality/city"
            >
              <Textarea
                id="address"
                value={form.address}
                invalid={!!errors.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="e.g. 45 Rizal Street, Purok 2, Teremil, Santa Rosa"
                rows={3}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Role in the household"
                required
                htmlFor="householdRole"
                error={errors.householdRole}
              >
                <Select
                  id="householdRole"
                  value={form.householdRole}
                  invalid={!!errors.householdRole}
                  onChange={(e) => update('householdRole', e.target.value)}
                >
                  <option value="">Select…</option>
                  {HOUSEHOLD_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label="Household size"
                required
                htmlFor="householdSize"
                error={errors.householdSize}
                hint="How many people live there"
              >
                <Input
                  id="householdSize"
                  type="number"
                  min={1}
                  value={form.householdSize}
                  invalid={!!errors.householdSize}
                  onChange={(e) => update('householdSize', e.target.value)}
                  placeholder="e.g. 4"
                />
              </FormField>
            </div>

            <p className="text-xs text-slate-400">
              You can add more details later — like your emergency contact — from your profile after
              signing in.
            </p>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-1">
          {step > 1 && (
            <Button
              key="back"
              type="button"
              variant="secondary"
              onClick={goBack}
              className="flex-1 h-12 text-base sm:h-11 sm:text-sm"
            >
              <ArrowLeft size={16} /> Back
            </Button>
          )}
          {step < 2 ? (
            <Button
              key="next"
              type="button"
              onClick={goNext}
              className="flex-1 h-12 text-base sm:h-11 sm:text-sm"
            >
              Next <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              key="submit"
              type="submit"
              loading={loading}
              className="flex-1 h-12 text-base sm:h-11 sm:text-sm"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          )}
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
