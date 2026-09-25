import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2, AlertCircle, Sun, Moon, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SystemBootSequence } from '../components/auth/SystemBootSequence';

export const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [isBooting, setIsBooting] = useState(false);

  // If already authenticated and not booting, redirect to home/intended path
  const from = (location.state as any)?.from?.pathname || '/';
  
  React.useEffect(() => {
    if (isAuthenticated && !isBooting) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isBooting, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUsernameError(false);
    setPasswordError(false);

    const trimmedUser = username.trim();

    if (!trimmedUser) {
      setErrorMessage('Please enter your email or username.');
      setUsernameError(true);
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      setPasswordError(true);
      return;
    }

    setIsSubmitting(true);

    try {
      await login(trimmedUser, password);
      // Trigger system boot sequence animation overlay
      setIsBooting(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
      setIsSubmitting(false);
    }
  };

  const handleBootComplete = () => {
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors font-sans relative overflow-x-hidden">
      {/* Post-Login Boot Sequence Animation Overlay */}
      {isBooting && (
        <SystemBootSequence onComplete={handleBootComplete} />
      )}

      {/* Top Right Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-30">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm backdrop-blur-md"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 hover:rotate-12 transition-transform" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700 hover:-rotate-12 transition-transform" />
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
         LEFT SIDE — CNIS BRANDING & IDENTITY
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="w-full md:w-1/2 lg:w-5/12 bg-slate-950 text-white relative p-8 md:p-12 lg:p-16 flex flex-col justify-between overflow-hidden border-b md:border-b-0 md:border-r border-slate-800/80 shrink-0">
        {/* Subtle Visual Background Grid & Lighting Elements */}
        <div className="absolute inset-0 bg-radial-gradient opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(6, 182, 212, 0.15), transparent 60%)' }} />
        
        {/* Subtle Faint Network Vector Pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#06B6D4" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="1.5" fill="#06B6D4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>

        {/* Top Header Identity */}
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-[11px] font-mono font-medium tracking-wider">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>SECURE INVESTIGATION GATEWAY</span>
          </div>
        </div>

        {/* Center Prominent CNIS Logo & Branding Content */}
        <div className="relative z-10 my-12 md:my-auto space-y-8">
          {/* Prominent Logo with Subtle Continuous 360° Rotation */}
          <div className="inline-block relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-cyan-600 to-slate-900 p-0.5 shadow-2xl shadow-cyan-950/60 border border-cyan-500/40 group">
              <div className="w-full h-full rounded-[14px] bg-[#0B0F19] flex items-center justify-center relative overflow-hidden">
                {/* Continuous Slow 360° Rotating Shield Element */}
                <div className="animate-logo-rotate transition-transform duration-700">
                  <Shield className="w-10 h-10 md:w-12 md:h-12 text-cyan-400" />
                </div>
              </div>
            </div>
            {/* Ambient Radial Backlight */}
            <div className="absolute -inset-2 rounded-3xl bg-cyan-500/15 blur-xl pointer-events-none" />
          </div>

          {/* Clean Typography */}
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold font-mono tracking-tight text-white">
              CNIS PLATFORM
            </h1>
            <p className="text-base md:text-lg text-slate-300 font-medium tracking-wide">
              Crime Network Intelligence System
            </p>
            <div className="pt-2">
              <span className="inline-block text-xs font-mono font-semibold tracking-widest text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-800/40 px-3 py-1.5 rounded-lg">
                Intelligence • Investigation • Evidence
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Platform Descriptor */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 text-xs text-slate-400 font-mono flex items-center justify-between">
          <span>UNAUTHORIZED ACCESS PROHIBITED</span>
          <span className="text-cyan-400/80">TLS 1.3 SECURE</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
         RIGHT SIDE — DYNAMIC LOGIN FORM WITH GLASSMORPHISM
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="w-full md:w-1/2 lg:w-7/12 flex items-center justify-center p-6 md:p-12 lg:p-16 relative overflow-hidden bg-slate-100/80 dark:bg-[#070B14]/80">
        {/* Ambient Glowing Orbs for Glass Refraction */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-400/20 dark:bg-cyan-500/20 blur-[100px] animate-ambient-glow" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-purple-400/15 dark:bg-purple-500/20 blur-[100px] animate-ambient-glow" style={{ animationDelay: '-4s' }} />

        <div className="w-full max-w-md space-y-8 bg-white/75 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 rounded-2xl p-8 md:p-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.08)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-2xl relative z-10">
          {/* Card Heading */}
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Welcome back
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              Access the secure CNIS intelligence operations center
            </p>
          </div>

          {/* Generic Clean Error Message Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs p-4 rounded-xl flex items-start gap-3 shadow-xs backdrop-blur-md"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* Email / Username Input */}
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono"
              >
                Email or Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (usernameError) setUsernameError(false);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter your email or username"
                aria-invalid={usernameError}
                aria-describedby={usernameError ? "username-error" : undefined}
                className={`w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/90 border text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all ${
                  usernameError
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:border-cyan-600 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
                }`}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(false);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter your password"
                  aria-invalid={passwordError}
                  aria-describedby={passwordError ? "password-error" : undefined}
                  className={`w-full px-4 py-3 pr-12 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/90 border text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all ${
                    passwordError
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-cyan-600 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] border border-cyan-400/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-mono tracking-wide"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Access Intelligence Platform &rarr;</span>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              Protected by CNIS Multi-Factor Session Verification
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
