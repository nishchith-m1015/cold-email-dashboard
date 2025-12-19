import { SignIn } from '@clerk/nextjs';
import { Mail, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import Image from 'next/image';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Left side - Branding (60%) - Desktop only */}
      <div className="hidden lg:flex lg:w-3/5 p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800">
        {/* Subtle accent border */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent" />
        
        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg">
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-xl font-semibold text-white">Cold Email</span>
              <span className="block text-[10px] uppercase tracking-wider font-medium text-slate-400">Analytics</span>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
              Track your outreach.
              <span className="block bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                Scale your success.
              </span>
            </h1>
            <p className="text-slate-400 text-base max-w-md leading-relaxed">
              Real-time analytics for cold email campaigns. Monitor performance, track costs, and optimize your outreach.
            </p>
          </div>
          
          {/* Features - Simplified list */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-300">
              <Mail className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-sm">Track opens, clicks, and replies</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-sm">Advanced analytics and metrics</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <Zap className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-sm">Monitor LLM usage and costs</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <BarChart3 className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-sm">Compare campaign performance</span>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-500 text-sm">
           Built for high-performance outreach teams
          </p>
        </div>
      </div>
      
      {/* Right side - Sign in form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo - Centered */}
          <div className="lg:hidden flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg mb-4">
              <Image src="/logo.png" alt="Logo" width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Cold Email</h1>
              <p className="text-xs uppercase tracking-widest font-medium text-slate-400 mt-0.5">Analytics</p>
            </div>
          </div>
          
          <SignIn 
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-surface-card border border-border shadow-xl rounded-xl',
                headerTitle: 'text-xl md:text-2xl font-semibold text-text-primary',
                headerSubtitle: 'text-text-secondary text-sm',
                socialButtonsBlockButton: 'bg-surface-elevated border border-border hover:bg-surface-elevated/80 text-text-primary transition-colors',
                socialButtonsBlockButtonText: 'text-text-primary font-medium text-sm',
                dividerLine: 'bg-border',
                dividerText: 'text-text-secondary text-xs',
                formFieldLabel: 'text-text-secondary text-sm font-medium',
                formFieldInput: 'bg-surface-elevated border-border text-text-primary placeholder:text-text-secondary/60 focus:border-accent-primary focus:ring-accent-primary/20 text-sm',
                formButtonPrimary: 'bg-accent-primary hover:bg-accent-primary/90 text-white shadow-sm transition-colors',
                footerActionLink: 'text-accent-primary hover:text-accent-primary/80',
                identityPreviewText: 'text-text-primary',
                identityPreviewEditButton: 'text-accent-primary',
                formFieldInputShowPasswordButton: 'text-text-secondary hover:text-text-primary',
                footer: 'hidden',
              },
              variables: {
                colorPrimary: '#3b82f6',
                colorText: 'var(--text-primary)',
                colorTextSecondary: 'var(--text-secondary)',
                colorBackground: 'var(--surface-card)',
                colorInputBackground: 'var(--surface-elevated)',
                colorInputText: 'var(--text-primary)',
                borderRadius: '0.5rem',
              },
              layout: {
                socialButtonsPlacement: 'top',
                socialButtonsVariant: 'blockButton',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
