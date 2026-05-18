import { Link } from 'react-router-dom';
import { Zap, CheckCircle, Clock, TrendingUp, Shield, Star, ArrowRight, Phone, FileText, ThumbsUp } from 'lucide-react';

const TRADES = ['⚡ Electricians', '🏠 Roofers', '❄️ HVAC', '🎨 Painters', '🔧 Plumbers', '🚿 Drain & Sewer', '🏗️ General Contractors'];

const FEATURES = [
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Pre-Loaded Price Books',
    desc: '93 trade-specific items ready to go. Tap to add materials and labor — no typing required.',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Automated Profit Margins',
    desc: 'Set your desired markup once. ZenBid calculates overhead and profit perfectly every time.',
  },
  {
    icon: <Phone className="w-6 h-6" />,
    title: 'Mobile-First Proposals',
    desc: 'Clients get a beautiful link they can open on their phone and approve with one tap.',
  },
  {
    icon: <ThumbsUp className="w-6 h-6" />,
    title: 'Instant Client Approval',
    desc: 'Your dashboard lights up green the moment a client approves. No chasing, no emails.',
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'Save 10+ Hours a Week',
    desc: 'Stop typing estimates at the kitchen table at 8:00 PM. Build bids in the truck, in minutes.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Bank-Grade Security',
    desc: '100% data ownership. Your client list and pricing are encrypted and never shared.',
  },
];

const TESTIMONIALS = [
  { name: 'Mike R.', trade: 'Roofing Contractor', text: 'I sent a proposal on the spot and had an approval by the time I got back to the office. That never happened before.', stars: 5 },
  { name: 'Sandra K.', trade: 'Electrical Company Owner', text: 'My guys were doing estimates in Word. Now they look like a million dollar company on every single bid.', stars: 5 },
  { name: 'Carlos M.', trade: 'HVAC Technician', text: 'I used to spend Sunday nights catching up on quotes. Now I do it in the truck and have my evenings back.', stars: 5 },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-inter">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">ZenBid <span className="text-indigo-600">Pro</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link to="/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5">
              Start Free Trial →
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center relative">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full px-4 py-1.5 text-indigo-300 text-sm font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            Built for the 7 biggest contractor trades
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6 tracking-tight">
            Stop Writing Estimates.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Start Closing Jobs.
            </span>
          </h1>

          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Build a professional, branded proposal in minutes. Text it to the homeowner.
            They approve it <strong className="text-white">before you leave the driveway.</strong>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              to="/signup"
              id="hero-cta-btn"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/50 hover:-translate-y-1 hover:shadow-indigo-800/50 flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="border border-white/20 text-white/80 hover:text-white hover:border-white/40 font-medium text-lg px-8 py-4 rounded-2xl transition-all backdrop-blur-sm"
            >
              Sign In
            </Link>
          </div>

          {/* Trade badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {TRADES.map(t => (
              <span key={t} className="bg-white/10 border border-white/10 text-white/70 text-sm px-3 py-1.5 rounded-full backdrop-blur-sm">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">Build. Send. Close.</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">The entire process from walkthrough to signed proposal in under 5 minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: '🔨', title: 'Build in the Truck', desc: 'Tap from your pre-loaded trade price book to add materials and labor instantly. No typing. No guessing.' },
              { step: '02', icon: '📱', title: 'Send a Smart Link', desc: 'Hit send. Your client gets a branded, interactive proposal on their phone in seconds — not a clunky PDF.' },
              { step: '03', icon: '✅', title: 'Watch it Get Approved', desc: 'Client taps "Approve This Bid." Your dashboard lights up green. The job is locked in.' },
            ].map(item => (
              <div key={item.step} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 group">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="text-xs font-bold text-indigo-500 mb-2 tracking-widest uppercase">Step {item.step}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">Everything You Need to Win More Jobs</h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">Not a bloated dispatching tool. A dedicated sales engine.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all hover:shadow-md">
                <div className="w-12 h-12 bg-indigo-100 group-hover:bg-indigo-600 rounded-xl flex items-center justify-center text-indigo-600 group-hover:text-white transition-all mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Contractors Love It</h2>
            <p className="text-slate-400 text-lg">Real results from real tradespeople.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
                <div className="flex mb-4">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                <div>
                  <div className="font-bold text-white text-sm">{t.name}</div>
                  <div className="text-slate-500 text-xs">{t.trade}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING CTA */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="max-w-3xl mx-auto px-6 text-center relative">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            Ready to Win Your Next Job?
          </h2>
          <p className="text-indigo-200 text-lg mb-4 max-w-xl mx-auto">
            Start with a 30-day trial. See the ROI. Then lock in your annual enterprise license.
          </p>
          <div className="flex items-center justify-center gap-4 mb-10 flex-wrap text-sm text-indigo-200">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-white" /> White-glove setup</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-white" /> 93 pre-loaded items</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-white" /> Cancel anytime</span>
          </div>
          <Link
            to="/signup"
            id="bottom-cta-btn"
            className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold text-lg px-10 py-4 rounded-2xl hover:bg-indigo-50 transition-all shadow-2xl hover:-translate-y-1"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 py-10 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white">ZenBid Pro</span>
          </div>
          <div className="text-slate-500 text-sm">© {new Date().getFullYear()} ZenBid Pro. All rights reserved.</div>
          <div className="flex gap-5 text-sm text-slate-500">
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-white transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
