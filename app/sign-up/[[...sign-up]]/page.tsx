import { SignUp } from '@clerk/nextjs';
import { BarChart3, CheckCircle } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0f0f14] via-[#141420] to-[#0a0a10] p-12 flex-col justify-between relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        
        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Cold Email Analytics</span>
          </div>
        </div>
        
        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Get started in<br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                minutes.
              </span>
            </h1>
            <p className="text-[#a1a1aa] text-lg max-w-md">
              Create your account and start tracking your cold email campaigns 
              with powerful analytics.
            </p>
          </div>
          
          {/* Benefits */}
          <div className="space-y-4">
            {[
              'Real-time email tracking & analytics',
              'LLM cost monitoring across providers',
              'Multi-campaign performance comparison',
              'Team collaboration with role-based access',
              'Beautiful, fast, modern dashboard',
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-[#e4e4e7]">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[#52525b] text-sm">
            Trusted by high-performing outreach teams
          </p>
        </div>
      </div>
      
      {/* Right side - Sign up form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Cold Email Analytics</span>
          </div>
          
          <SignUp 
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
          />
        </div>
      </div>
    </div>
  );
}

