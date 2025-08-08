'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Service = { id: string; name: string; price: number };

export default function IntakePage() {
  const sp = useSearchParams();
  const router = useRouter();
  const stylistId = sp.get('s') || '';
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!stylistId) return;
    supabase.from('services').select('id,name,price').eq('stylist_id', stylistId).order('name', { ascending: true })
      .then(({ data }) => setServices((data || []) as any));
  }, [stylistId]);

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!stylistId) { setErr('Missing stylist. Use the link from your stylist.'); return; }
    if (!fullName || !phone || selectedServiceIds.length === 0) { setErr('Please fill name, phone, and at least one service.'); return; }

    setLoading(true);
    try {
      const { data: existing } = await supabase.from('clients').select('id').eq('phone', phone).maybeSingle();
      let clientId = existing?.id;
      if (!clientId) {
        const { data: c, error: ce } = await supabase.from('clients').insert({
          full_name: fullName, phone, notes: null
        }).select('id').single();
        if (ce) throw ce;
        clientId = c.id;
      } else {
        await supabase.from('clients').update({ full_name: fullName }).eq('id', clientId);
      }

      let preferred_at: string | null = null;
      if (preferredDate && preferredTime) preferred_at = new Date(`${preferredDate}T${preferredTime}:00`).toISOString();

      const { data: appt, error: ae } = await supabase.from('appointments').insert({
        stylist_id: stylistId,
        client_id: clientId,
        status: 'requested',
        preferred_at,
        notes
      }).select('id').single();
      if (ae) throw ae;

      const { data: selected } = await supabase.from('services').select('name').in('id', selectedServiceIds);
      const names = (selected || []).map(s => s.name).join(', ');
      await supabase.from('appointments').update({ notes: (notes ? notes + ' | ' : '') + `Requested services: ${names}` }).eq('id', appt.id);

      setOk(true);
    } catch (e: any) {
      setErr(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (ok) {
    return (
      <main className="p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Request received 🎉</h1>
        <p className="mb-4">Your stylist will confirm or suggest a new time.</p>
        <button onClick={() => router.push('/')} className="w-full rounded-xl py-3 bg-pink-600 text-white">Return Home</button>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-1">New Client Intake</h1>
      <p className="text-sm text-gray-500 mb-4">Fill this out to request an appointment.</p>

      {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="w-full border rounded-lg p-3" placeholder="Full Name" value={fullName} onChange={e=>setFullName(e.target.value)} />
        <input className="w-full border rounded-lg p-3" placeholder="Phone (digits only)" value={phone} onChange={e=>setPhone(e.target.value)} />

        <div>
          <p className="font-medium mb-2">Services</p>
          <div className="grid grid-cols-2 gap-2">
            {services.map(s => (
              <button type="button" key={s.id}
                onClick={()=>toggleService(s.id)}
                className={`border rounded-lg p-3 text-left ${selectedServiceIds.includes(s.id) ? 'border-pink-600 bg-pink-50' : ''}`}>
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-gray-500">${s.price}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input type="date" className="w-full border rounded-lg p-3" value={preferredDate} onChange={(e)=>setPreferredDate(e.target.value)} />
          <input type="time" className="w-full border rounded-lg p-3" value={preferredTime} onChange={(e)=>setPreferredTime(e.target.value)} />
        </div>

        <textarea className="w-full border rounded-lg p-3" placeholder="Anything you'd like me to know? (optional)" value={notes} onChange={e=>setNotes(e.target.value)} />

        <button disabled={loading} className="w-full rounded-xl py-3 bg-pink-600 text-white">
          {loading ? 'Submitting...' : 'Request Appointment'}
        </button>
      </form>
    </main>
  );
}
