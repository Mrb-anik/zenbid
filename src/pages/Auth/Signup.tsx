import { Link } from 'react-router-dom';
import { Zap, ShieldCheck } from 'lucide-react';

export default function Signup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 font-inter">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-6">
          <Zap className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-3">Invite-Only Platform</h1>
        <p className="text-slate-300 text-base max-w-sm mx-auto mb-8 leading-relaxed">
          ZenBid Pro is an elite, closed-access platform for top-tier professional contractors. Public registration is strictly disabled.
        </p>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl text-left mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-300 flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base mb-1">How do I get access?</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Access is granted exclusively through our official waitlist or direct administrative invitation. When your enterprise seat is approved, you will receive a secure magic setup link directly in your inbox.
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="block w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-center rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5"
          >
            Join the Official Waitlist →
          </Link>
        </div>

        <div className="text-center">
          <p className="text-slate-400 text-sm">
            Already an approved member?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
