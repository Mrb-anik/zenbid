import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { formatCurrency } from '../lib/calculations';
import type { SubcontractorBid } from '../types';
import { toast } from 'sonner';
import { Users, FileText, CheckCircle, Mail, DollarSign, Send, Info, Check, ShieldAlert } from 'lucide-react';

export default function SubcontractorPortal() {
  const { token } = useParams<{ token: string }>();
  const [bid, setBid] = useState<SubcontractorBid | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Subcontractor inputs
  const [bidAmount, setBidAmount] = useState('');
  const [subNotes, setSubNotes] = useState('');
  const [scopeItems, setScopeItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchBid = async () => {
      if (!token) return;
      setLoading(true);
      const { data, error } = await (supabase as any)
        .rpc('get_subcontractor_bid_by_token', { token: token });

      if (error || !data || data.length === 0) {
        setNotFound(true);
      } else {
        const b = data[0] as SubcontractorBid;
        setBid(b);
        setBidAmount(b.bid_amount ? b.bid_amount.toString() : '');
        setSubNotes(b.notes || '');
        setScopeItems(b.scope_items || []);
        if (b.status === 'bid_submitted' || b.status === 'accepted' || b.status === 'rejected') {
          setSubmitted(true);
        }
        
        // Mark bid as viewed if it was only invited
        if (b.status === 'invited') {
          await supabase
            .from('subcontractor_bids')
            .update({ status: 'viewed', updated_at: new Date().toISOString() })
            .eq('id', b.id);
        }
      }
      setLoading(false);
    };
    fetchBid();
  }, [token]);

  const handleSubmitBid = async () => {
    if (!bidAmount.trim() || parseFloat(bidAmount) <= 0) {
      toast.error('Please enter a valid bid amount.');
      return;
    }
    setSubmitting(true);
    const { data: submitSuccess, error } = await (supabase as any).rpc('submit_subcontractor_bid_by_token', {
      token: token,
      amount: parseFloat(bidAmount),
      notes_val: subNotes,
      items_snapshot: scopeItems
    });

    setSubmitting(false);
    if (error || !submitSuccess) {
      toast.error('Failed to submit bid. Please try again.');
    } else {
      setSubmitted(true);
      setBid(prev => prev ? { ...prev, status: 'bid_submitted', bid_amount: parseFloat(bidAmount), notes: subNotes, scope_items: scopeItems } : null);
      toast.success('Bid submitted successfully! The contractor has been notified.');
    }
  };

  const handleToggleItem = (index: number) => {
    if (submitted) return;
    setScopeItems(prev => prev.map((item, i) => i === index ? { ...item, completed: !item.completed } : item));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-copper border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !bid) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold font-sora text-slate-800 dark:text-white">Invite Link Invalid</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">This bidding link may be expired, deleted, or incorrect.</p>
        </div>
      </div>
    );
  }

  const isAccepted = bid.status === 'accepted';
  const isRejected = bid.status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-navy-950 font-inter text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* ── Header ── */}
      <div className="w-full bg-navy-900 dark:bg-navy-950 border-b border-navy-800 dark:border-navy-900 py-6 transition-colors">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-navy-800 dark:bg-navy-900 border border-navy-700/50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-copper" />
            </div>
            <div>
              <div className="text-white font-bold text-lg font-sora">Subcontractor Portal</div>
              <div className="text-slate-400 text-xs mt-0.5 font-medium">{bid.sub_name} · Scope Review</div>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-copper block text-left sm:text-right">Project Scope</span>
            <div className="text-white font-bold font-sora text-base">{bid.trade_scope}</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 space-y-6">
        {/* Status Messages */}
        {isAccepted && (
          <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <div className="text-emerald-800 dark:text-emerald-350 font-bold text-sm">Bid Accepted!</div>
              <div className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">The general contractor has accepted your bid. They will contact you shortly to coordinate scheduling.</div>
            </div>
          </div>
        )}
        {isRejected && (
          <div className="bg-red-50/20 dark:bg-red-950/10 border border-red-100/40 dark:border-red-900/10 rounded-2xl px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <div className="text-red-800 dark:text-red-400 font-bold text-sm">Bid Closed</div>
              <div className="text-slate-650 dark:text-slate-400 text-xs mt-0.5 font-medium">This bid has been rejected or marked inactive by the contractor.</div>
            </div>
          </div>
        )}
        {submitted && !isAccepted && !isRejected && (
          <div className="bg-copper-50/20 dark:bg-copper-950/10 border border-copper-200 dark:border-copper-800/40 rounded-2xl px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">📨</span>
            <div>
              <div className="text-copper font-bold text-sm font-sora">Bid Submitted Successfully</div>
              <div className="text-slate-600 dark:text-slate-350 text-xs mt-0.5">Your pricing of {formatCurrency(bid.bid_amount || 0)} has been sent. You will be notified once they review.</div>
            </div>
          </div>
        )}

        {/* Detailed Scope of Work */}
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-2xl p-6 shadow-soft space-y-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Trade &amp; Scope Requirements</h3>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-navy-950 p-4 rounded-xl border border-slate-100 dark:border-navy-800 leading-relaxed">{bid.trade_scope}</p>
          </div>

          {/* Scope Checklist items (if any exist in scope_items array) */}
          {scopeItems.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Scope Items Checklist</h3>
              <div className="space-y-2">
                {scopeItems.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => handleToggleItem(idx)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      submitted ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-950/40'
                    } ${
                      item.completed 
                        ? 'border-emerald-200 bg-emerald-50/10 dark:border-emerald-800/30' 
                        : 'border-slate-150 bg-white dark:border-navy-850 dark:bg-navy-900'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      item.completed 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-slate-300 dark:border-navy-700'
                    }`}>
                      {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className={`text-xs font-medium ${item.completed ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                      {item.description || `Scope item #${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pricing Inputs */}
        {!submitted && (
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-2xl p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-bold font-sora text-slate-800 dark:text-white uppercase tracking-wider">Submit Your Bid Pricing</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1.5 block">Total Bid Amount ($) *</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    className="w-full pl-7 pr-3.5 py-2.5 text-sm border border-slate-200 dark:border-navy-750 rounded-xl bg-slate-50 dark:bg-navy-950/60 focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper/40 transition-all text-slate-800 dark:text-slate-100 font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1.5 block">Bid Notes / Exclusions / Details</label>
                <textarea
                  rows={4}
                  placeholder="Include any specific details, exclusions, or scheduling constraints..."
                  value={subNotes}
                  onChange={e => setSubNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-navy-750 rounded-xl bg-slate-50 dark:bg-navy-950/60 focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper/40 transition-all text-slate-800 dark:text-slate-100 resize-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 dark:border-navy-800 flex justify-end">
              <button
                onClick={handleSubmitBid}
                disabled={submitting}
                className="flex items-center gap-1.5 px-6 py-3.5 bg-copper hover:bg-copper-hover text-white rounded-xl text-sm font-bold disabled:opacity-60 transition-colors shadow-md shadow-copper/10"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting Bid...' : 'Submit Official Bid'}
              </button>
            </div>
          </div>
        )}

        {/* Submitted Bid Pricing (Review State) */}
        {submitted && (
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-2xl p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-bold font-sora text-slate-800 dark:text-white uppercase tracking-wider">Your Submitted Bid</h3>
            <div className="p-4 bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-navy-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Bid Amount</span>
                <p className="text-2xl font-bold font-sora text-copper mt-0.5">{formatCurrency(bid.bid_amount || 0)}</p>
              </div>
              <span className="text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                ✓ Recorded
              </span>
            </div>
            {bid.notes && (
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 block">Your Notes</span>
                <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed bg-slate-50/50 dark:bg-navy-950/40 p-4 rounded-xl border border-slate-100 dark:border-navy-850 whitespace-pre-wrap">{bid.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
