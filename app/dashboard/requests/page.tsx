
'use client';
import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { supabase } from '@/lib/supabaseClient';

interface Row {
  id: string;
  preferred_at: string | null;
  notes: string | null;
  clients: { full_name: string | null; phone: string | null } | null;
}

export default function RequestsPage() {
  return (
    <RequireAuth>
      <RequestsInner />
    </RequireAuth>
  );
}

function RequestsInner() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('id, preferred_at, notes, clients(full_name, phone)')
      .eq('status', 'requested')
      .order('created_at', { ascending: false });
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const confirm = async (id: string) => {
    await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', id);
    load();
  };

  const decline = async (id: string) => {
    await supabase.from('appointments').update({ status: 'declined' }).eq('id', id);
    load();
  };

  const reschedule = async (id: string) => {
    const date = prompt('New date (YYYY-MM-DD)');
    const time = prompt('New time (HH:MM, 24h)');
    if (!date || !time) return;
    const start = new Date(`${date}T${time}:00`).toISOString();
    await supabase
      .from('appointments')
      .update({ status: 'confirmed', preferred_at: start })
      .eq('id', id);
    load();
  };

  return (
    <main className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Pending Requests</h1>
      {loading && <div>Loading…</div>}
      {!loading && rows.length === 0 && <div>No pending requests.</div>}
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="border rounded-xl p-3">
            <div className="font-medium">
              {r.clients?.full_name || 'Unknown'} • {r.clients?.phone}
            </div>
            <div className="text-sm text-gray-500">
              {r.preferred_at ? new Date(r.preferred_at).toLocaleString() : 'No time selected'}
            </div>
            {r.notes && <div className="text-sm mt-1">{r.notes}</div>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => confirm(r.id)}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white"
              >
                Confirm
              </button>
              <button
                onClick={() => reschedule(r.id)}
                className="px-3 py-2 rounded-lg bg-amber-600 text-white"
              >
                Suggest New Time
              </button>
              <button
                onClick={() => decline(r.id)}
                className="px-3 py-2 rounded-lg bg-rose-600 text-white"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
