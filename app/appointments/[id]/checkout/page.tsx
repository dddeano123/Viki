
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';

type Service = { id: string; name: string; price: number; stripe_payment_link_url: string | null };
type Appointment = { id: string; notes: string | null; paid: boolean; client_id: string | null };

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [selected, setSelected] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: a } = await supabase
        .from('appointments')
        .select('id, notes, paid, client_id')
        .eq('id', id)
        .single();
      setAppt(a as any);

      const { data: svcs } = await supabase
        .from('services')
        .select('id,name,price,stripe_payment_link_url')
        .order('name');
      setServices((svcs || []) as any);
      setLoading(false);
    };
    load();
  }, [id]);

  const toggle = (svc: Service) => {
    setSelected((prev) =>
      prev.find((s) => s.id === svc.id)
        ? prev.filter((s) => s.id !== svc.id)
        : [...prev, svc]
    );
  };

  const openPayment = () => {
    const svc = selected.find((s) => !!s.stripe_payment_link_url);
    if (!svc || !svc.stripe_payment_link_url) {
      alert('This service has no payment link set.');
      return;
    }
    const url = new URL(svc.stripe_payment_link_url);
    url.searchParams.set('client_reference_id', String(id));
    window.location.href = url.toString();
  };

  const markPaid = async () => {
    await supabase
      .from('appointments')
      .update({ paid: true, status: 'completed' })
      .eq('id', id);
    alert('Marked as paid.');
    router.push('/finance');
  };

  if (loading || !appt) return <main className="p-4">Loading…</main>;

  return (
    <main className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Checkout</h1>
      <div className="text-sm text-gray-600">Appointment #{appt.id}</div>

      <div className="grid grid-cols-2 gap-2">
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => toggle(s)}
            className={`border rounded-xl p-3 text-left ${selected.find((x) => x.id === s.id) ? 'border-pink-600 bg-pink-50' : ''}`}
          >
            <div className="font-medium">{s.name}</div>
            <div className="text-sm text-gray-500">${s.price}</div>
          </button>
        ))}
      </div>

      <button
        onClick={openPayment}
        className="w-full rounded-xl py-3 bg-black text-white"
      >
        Open Stripe Payment Link
      </button>

      <div className="border rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Payment Status</div>
          <div className={`text-sm ${appt.paid ? 'text-emerald-600' : 'text-rose-600'}`}>
            {appt.paid ? 'Paid' : 'Unpaid'}
          </div>
        </div>
        {!appt.paid && (
          <button
            onClick={markPaid}
            className="mt-3 w-full rounded-xl py-2 bg-emerald-600 text-white"
          >
            Mark as Paid (manual)
          </button>
        )}
      </div>
    </main>
  );
}
