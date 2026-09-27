import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import type { User, ApiError } from '../../types/auth';
import { Button } from '../../components/ui/button';
import { Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff, ShieldAlert, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
});

type RegisterFields = z.infer<typeof registerSchema>;

interface RegisterProps {
  onLoginRedirect: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onLoginRedirect }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFields) => {
    setIsLoading(true);
    setServerError(null);
    try {
      await api.post<User>('/auth/register', data);
      setIsSuccess(true);
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const apiError = error.response.data as ApiError;
        setServerError(apiError.error.message || 'Registration failed. Please try again.');
      } else {
        setServerError('Could not connect to server. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] pointer-events-none" />

        <div className="w-full max-w-[440px] px-6 z-10 text-center">
          <div className="bg-[#121214]/65 backdrop-blur-xl border border-white/[0.08] p-8 rounded-3xl shadow-2xl shadow-black/40 space-y-6">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-extrabold text-white">Registration Successful!</h3>
            <p className="text-sm text-gray-400">
              Your account has been created successfully. You can now sign in using your credentials.
            </p>
            <Button
              onClick={onLoginRedirect}
              className="w-full h-11 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/10 transition-all cursor-pointer flex items-center justify-center active:scale-[0.98]"
            >
              Go to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] pointer-events-none" />

      <div className="w-full max-w-[460px] px-6 z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-blue-500/20 border border-white/10 mb-4 shadow-lg shadow-purple-500/5">
            <svg className="w-8 h-8 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Create Account
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Get started with our premium workspace today
          </p>
        </div>

        <div className="bg-[#121214]/65 backdrop-blur-xl border border-white/[0.08] p-8 rounded-3xl shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {serverError && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">First Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    {...register('first_name')}
                    type="text"
                    placeholder="John"
                    className="w-full bg-[#0d0d0f]/80 text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all placeholder:text-gray-600 text-sm"
                  />
                </div>
                {errors.first_name && (
                  <p className="text-xs text-red-400 font-medium mt-1">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Last Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    {...register('last_name')}
                    type="text"
                    placeholder="Doe"
                    className="w-full bg-[#0d0d0f]/80 text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all placeholder:text-gray-600 text-sm"
                  />
                </div>
                {errors.last_name && (
                  <p className="text-xs text-red-400 font-medium mt-1">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Email Address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="name@company.com"
                  className="w-full bg-[#0d0d0f]/80 text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all placeholder:text-gray-600 text-sm"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400 font-medium mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  className="w-full bg-[#0d0d0f]/80 text-white pl-10 pr-10 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all placeholder:text-gray-600 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-all cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 font-medium mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/10 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
            <p className="text-xs text-gray-400">
              Already have an account?{' '}
              <button
                onClick={onLoginRedirect}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 hover:underline transition-all cursor-pointer bg-transparent border-none"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
