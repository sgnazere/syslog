import { useState } from 'react';
import { useHolidays, useCreateHoliday, useDeleteHoliday } from '../hooks/useHolidays';
import { normISO, todayISO } from '../lib/requestGroups';
import { Holiday } from '../types';

const fmtDate = (iso: string) =>
  new Date(`${normISO(iso)}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

export const HolidaysPage = () => {
  const { data: holidays = [], isLoading } = useHolidays();
  const createMutation = useCreateHoliday();
  const deleteMutation = useDeleteHoliday();

  const [form, setForm]   = useState({ name: '', date: '', recurring: false });
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<Holiday | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Libellé requis.');
    if (!form.date)        return setError('Date requise.');
    setError('');
    await createMutation.mutateAsync({ ...form, name: form.name.trim() });
    setForm({ name: '', date: '', recurring: false });
  };

  const today    = todayISO();
  const upcoming = holidays.filter(h => normISO(h.date) >= today);
  const past     = holidays.filter(h => normISO(h.date) < today);

  const Row = ({ h }: { h: Holiday }) => (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">{h.name}</div>
        <div className="text-xs text-slate-500 capitalize">
          {fmtDate(h.date)}
          {h.recurring && <span className="ml-2 normal-case text-blue-600">· chaque année</span>}
        </div>
      </div>
      <button onClick={() => setDeleting(h)}
        className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg flex-shrink-0">
        Supprimer
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Jours fériés</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Les jours fériés sont signalés dans le calendrier des sorties.
        </p>
      </div>

      <form onSubmit={submit} className="card p-4 mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Libellé *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex. Fête de l'Indépendance" className="input" maxLength={100} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:pb-2.5">
          <input type="checkbox" checked={form.recurring}
            onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} />
          Chaque année
        </label>
        <button type="submit" disabled={createMutation.isPending} className="btn-primary">
          {createMutation.isPending ? 'Ajout…' : '+ Ajouter'}
        </button>
        {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
      </form>

      {isLoading ? (
        <div className="text-sm text-slate-500">Chargement…</div>
      ) : holidays.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">Aucun jour férié enregistré.</div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 mb-2">À venir</h2>
              <div className="card">{upcoming.map(h => <Row key={h.id} h={h} />)}</div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 mb-2">Passés</h2>
              <div className="card opacity-80">{past.map(h => <Row key={h.id} h={h} />)}</div>
            </section>
          )}
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-2">Supprimer ce jour férié ?</h2>
            <p className="text-sm text-slate-600 mb-5">{deleting.name} — {fmtDate(deleting.date)}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={async () => { await deleteMutation.mutateAsync(deleting.id); setDeleting(null); }}
                disabled={deleteMutation.isPending}
                className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
