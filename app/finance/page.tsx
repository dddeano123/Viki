
'use client';
import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { supabase } from '@/lib/supabaseClient';

type Payment = {
  id: string;
  amount_cents: number | null;
  method: string | null;
  created_at: string;
  appointment_id: string | null;
};

export default function FinancePage() {
  return (
    <RequireAuth>
      <FinanceInner />
    </RequireAuth>
  );
}

function FinanceInner() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: pay } = await supabase
        .from('payments')
        .select('id, amount_cents, method, created_at, appointment_id')
        .order('created_at', { ascending: false });
      if (pay && pay.length) {
        setRows(pay as any);
        setLoading(false);
      } else {
        const { data: appts } = await supabase
          .from('appointments')
          .select('id, paid, status, preferred_at')
          .eq('paid', true)
          .order('preferred_at', { ascending: false });
        const mapped = (appts || []).map((a: any) => ({
          id: crypto.randomUUID(),
          amount_cents: null,
          method: 'unknown',
          created_at: a.preferred_at || new Date().toISOString(),
          appointment_id: a.id
        }));
        setRows(mapped);
        setLoading(false);
      }
    };
    load();
  }, []);

  const exportCSV = () => {
    const header = ['payment_id','appointment_id','amount','method','created_at'];
    const lines = rows.map(r => [
      r.id,
      r.appointment_id || '',
      r.amount_cents != null ? (r.amount_cents/100).toFixed(2) : '',
      r.method || '',
      new Date(r.created_at).toISOString()
    ].map(csvEscape).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viki_finance_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Finance</h1>
        <button onClick={exportCSV} className="rounded-lg px-3 py-2 bg-black text-white">Export CSV</button>
      </div>
      {loading && <div>Loading…</div>}
      {!loading && rows.length === 0 && <div>No payments found.</div>}
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="border rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-sm">Payment: {r.id.slice(0,8)}…</div>
              <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="font-medium">{r.amount_cents != null ? `$${(r.amount_cents/100).toFixed(2)}` : '—'}</div>
              <div className="text-xs text-gray-500">{r.method || ''}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function csvEscape(x: any) {
  const s = String(x ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
