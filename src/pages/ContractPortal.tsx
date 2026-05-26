import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../api/supabase';
import { calcFinancing, formatMonthly } from '../lib/pricingEngine';
import { formatCurrency } from '../lib/calculations';
import type { MaintenanceContract } from '../types';
import { TRADE_EMOJIS } from '../types';
import { toast } from 'sonner';
import { FileText, CheckCircle, RefreshCw, Pen, ShieldAlert, Check, X, Calendar, DollarSign, Clock } from 'lucide-react';

// ── Canvas Signature Pad ─────────────────────────────────────────────────────
function SignaturePad({
  onSign,
  onClear,
  signed,
}: {
  onSign: (dataUrl: string) => void;
  onClear: () => void;
  signed: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#C58B5C' : '#1E293B';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    lastPos.current = pos;
  }, []);

  const endDraw = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPos.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSign(canvas.toDataURL('image/png'));
  }, [onSign]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', endDraw);
    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      window.removeEventListener('mouseup', endDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      window.removeEventListener('touchend', endDraw);
    };
  }, [startDraw, draw, endDraw]);

  return (
    <div className="space-y-2">
      <div
        className={`relative rounded-xl border-2 ${
          signed 
            ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/20' 
            : 'border-dashed border-slate-350 dark:border-navy-800 bg-slate-50 dark:bg-navy-950/40'
        } transition-colors overflow-hidden`}
        style={{ height: 96 }}
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={192}
          className="w-full h-full cursor-crosshair touch-none"
        />
        {!signed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-slate-400 dark:text-slate-500 select-none">✍️ Sign here</span>
          </div>
        )}
      </div>
      {signed && (
        <button
          onClick={handleClear}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors underline"
        >
          Clear signature
        </button>
      )}
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────
export default function ContractPortal() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [contract, setContract] = useState<MaintenanceContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState(false);

  // Prefilled / customer editable names
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  useEffect(() => {
    const fetchContract = async () => {
      if (!shareToken) return;
      setLoading(true);
      const { data, error } = await (supabase as any)
        .rpc('get_maintenance_contract_by_token', { token: shareToken });

      if (error || !data || data.length === 0) {
        setNotFound(true);
      } else {
        const c = data[0] as MaintenanceContract;
        setContract(c);
        setClientName(c.client_name);
        setClientEmail(c.client_email);
      }
      setLoading(false);
    };
    fetchContract();
  }, [shareToken]);

  const handleSignContract = async () => {
    if (!contract) return;
    if (!clientName.trim() || !clientEmail.trim()) {
      toast.error('Please enter your full name and email address.');
      return;
    }
    if (!signatureDataUrl) {
      setSignatureError(true);
      toast.error('Please sign the contract to proceed.');
      return;
    }

    setSubmitting(true);
    const { data: signSuccess, error } = await (supabase as any).rpc('sign_maintenance_contract_by_token', {
      token: shareToken,
      signature: signatureDataUrl,
      client_name_val: clientName,
      client_email_val: clientEmail,
    });

    setSubmitting(false);
    if (error || !signSuccess) {
      toast.error('Failed to sign agreement. Please try again.');
    } else {
      setSubmitted(true);
      setContract(prev => prev ? { 
        ...prev, 
        status: 'active',
        signed_at: new Date().toISOString(),
        signature_data: signatureDataUrl,
        client_name: clientName,
        client_email: clientEmail
      } : null);
      toast.success('Contract signed successfully! Thank you.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-copper border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !contract) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold font-sora text-slate-800 dark:text-white">Agreement Not Found</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">The link is invalid or may have been deleted by the representative.</p>
        </div>
      </div>
    );
  }

  const isSigned = contract.status === 'active' && !!contract.signed_at;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-navy-950 font-inter text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* ── Header ── */}
      <div className="w-full bg-navy-900 dark:bg-navy-950 border-b border-navy-800 dark:border-navy-900 py-6 transition-colors">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-navy-800 dark:bg-navy-900 border border-navy-700/50 rounded-xl flex items-center justify-center">
              <span className="text-white font-extrabold text-lg">
                {TRADE_EMOJIS[contract.trade] || '📋'}
              </span>
            </div>
            <div>
              <div className="text-white font-bold text-lg font-sora">Service Agreement</div>
              <div className="text-slate-400 text-xs mt-0.5 font-medium">{contract.title}</div>
            </div>
          </div>
          <div className="text-left md:text-right">
            <span className="text-[10px] uppercase font-bold tracking-widest text-copper block mb-0.5">Recurring Contract</span>
            <div className="text-white font-bold font-sora text-base">
              {formatCurrency(contract.monthly_amount)} / {contract.billing_cycle}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 space-y-6">
        {/* Status Banner */}
        {isSigned ? (
          <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl px-6 py-4 flex items-center gap-3 animate-fade-in">
            <span className="text-2xl">✅</span>
            <div>
              <div className="text-emerald-800 dark:text-emerald-350 font-bold text-sm">Agreement Signed &amp; Active</div>
              <div className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                Completed on {new Date(contract.signed_at!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <div className="text-amber-800 dark:text-amber-350 font-bold text-sm">Review &amp; Sign Your Agreement</div>
              <div className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">Please review the details below, fill in your details, and apply your digital signature.</div>
            </div>
          </div>
        )}

        {/* Contract Details Card */}
        <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-2xl p-6 shadow-soft space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100 dark:border-navy-800">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Contract For</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{contract.client_name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{contract.client_email}</p>
              {contract.client_phone && <p className="text-xs text-slate-500 dark:text-slate-400">{contract.client_phone}</p>}
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Agreement Terms</span>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-350 font-medium">
                {contract.start_date && (
                  <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-copper" /> Starts: {new Date(contract.start_date).toLocaleDateString()}</p>
                )}
                {contract.end_date && (
                  <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-copper" /> Expires: {new Date(contract.end_date).toLocaleDateString()}</p>
                )}
                <p className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 text-copper" /> Auto-Renew: {contract.auto_renew ? 'Yes' : 'No'}</p>
                {contract.visit_frequency && (
                  <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-copper" /> Service Frequency: {contract.visit_frequency}</p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {contract.description && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Overview</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{contract.description}</p>
            </div>
          )}

          {/* Scope of work */}
          {contract.scope_of_work && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Scope of Work</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{contract.scope_of_work}</p>
            </div>
          )}

          {/* Inclusions and Exclusions */}
          {((contract.inclusions && contract.inclusions.length > 0) || (contract.exclusions && contract.exclusions.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {contract.inclusions && contract.inclusions.length > 0 && (
                <div className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/10 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">Inclusions</h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-350 list-inside list-disc">
                    {contract.inclusions.map((inc, i) => <li key={i}>{inc}</li>)}
                  </ul>
                </div>
              )}
              {contract.exclusions && contract.exclusions.length > 0 && (
                <div className="bg-red-50/20 dark:bg-red-950/10 border border-red-100/40 dark:border-red-900/10 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">Exclusions</h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-350 list-inside list-disc">
                    {contract.exclusions.map((exc, i) => <li key={i}>{exc}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Client details verification and sign panel */}
        {!isSigned ? (
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-2xl p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-bold font-sora text-slate-800 dark:text-white uppercase tracking-wider">Confirm Your Details &amp; Sign</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 block">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-navy-750 rounded-xl bg-slate-50 dark:bg-navy-950/60 focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper/40 transition-all text-slate-800 dark:text-slate-100 font-medium"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 block">Your Email Address *</label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-navy-750 rounded-xl bg-slate-50 dark:bg-navy-950/60 focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper/40 transition-all text-slate-800 dark:text-slate-100 font-medium"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-50 dark:border-navy-800 mt-4 space-y-4">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 block">Draw Your Signature *</label>
              <SignaturePad
                onSign={(url) => { setSignatureDataUrl(url); setSignatureError(false); }}
                onClear={() => setSignatureDataUrl(null)}
                signed={!!signatureDataUrl}
              />
              {signatureError && (
                <p className="text-xs text-red-500 font-medium animate-pulse">Signature is required to activate agreement.</p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-50 dark:border-navy-800 flex justify-end">
              <button
                onClick={handleSignContract}
                disabled={submitting}
                className="flex items-center gap-1.5 px-6 py-3.5 bg-copper hover:bg-copper-hover text-white rounded-xl text-sm font-bold disabled:opacity-60 transition-colors shadow-md shadow-copper/10"
              >
                <Pen className="w-4 h-4" />
                {submitting ? 'Activating Contract...' : 'Sign &amp; Activate Agreement'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-2xl p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-bold font-sora text-slate-800 dark:text-white uppercase tracking-wider">Signatures</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-3">Client Signature</span>
                {contract.signature_data ? (
                  <div className="border border-slate-150 dark:border-navy-800 bg-slate-50 dark:bg-navy-950 rounded-xl p-2 flex items-center justify-center" style={{ height: 96 }}>
                    <img src={contract.signature_data} alt="Client Signature" className="max-h-full dark:invert transition-colors" />
                  </div>
                ) : (
                  <div className="border-b border-slate-200 dark:border-navy-850 h-24 flex items-center justify-center">
                    <span className="text-xs text-slate-400">Signed Electronically</span>
                  </div>
                )}
                <div className="text-[10px] text-slate-400 font-semibold mt-2">
                  Signed by: {contract.client_name} ({contract.client_email})
                </div>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1">Company representative</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-250 italic">PeakEstimator Operations</p>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold mt-4 sm:mt-0 pt-4 border-t border-slate-50 dark:border-navy-800/50">
                  Authorized Date: {contract.start_date ? new Date(contract.start_date).toLocaleDateString() : new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
