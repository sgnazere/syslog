import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

const MIN_LENGTH = 10;

/** Règles identiques à celles du serveur : 10 caractères, une lettre, un chiffre. */
export const passwordProblem = (pwd: string): string | null => {
  if (pwd.length < MIN_LENGTH) return `Au moins ${MIN_LENGTH} caractères.`;
  if (!/[A-Za-z]/.test(pwd))    return 'Au moins une lettre.';
  if (!/\d/.test(pwd))          return 'Au moins un chiffre.';
  return null;
};

export const PASSWORD_HINT = `${MIN_LENGTH} caractères minimum, avec au moins une lettre et un chiffre.`;

/**
 * Changement de mot de passe de l'utilisateur connecté.
 * `forced` : affiché après une création ou réinitialisation de compte, sans possibilité de fermer.
 */
export const ChangePasswordModal = ({ forced = false, onClose }: { forced?: boolean; onClose?: () => void }) => {
  const { updateUser, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next,    setNext]    = useState('');
  const [confirm, setConfirm] = useState('');
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(next);
    if (!current)         return setError('Saisissez votre mot de passe actuel.');
    if (problem)          return setError(problem);
    if (next !== confirm) return setError('Les deux mots de passe ne correspondent pas.');
    if (next === current) return setError('Le nouveau mot de passe doit être différent de l\'actuel.');
    setSaving(true);
    setError('');
    try {
      await api.put('/auth/change-password', { currentPassword: current, newPassword: next });
      updateUser({ must_change_password: false });
      toast.success('Mot de passe modifié.');
      onClose?.();
    } catch (err: any) {
      setError(err?.response?.data?.details?.[0]?.message || err?.response?.data?.error || 'Erreur lors du changement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Changer mon mot de passe</h2>
          {forced && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
              Votre mot de passe a été défini par un administrateur. Choisissez-en un nouveau pour continuer.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe actuel</label>
          <input type="password" autoComplete="current-password" value={current}
            onChange={e => setCurrent(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nouveau mot de passe</label>
          <input type="password" autoComplete="new-password" value={next}
            onChange={e => setNext(e.target.value)} className="input" />
          <p className="text-xs text-slate-400 mt-1">{PASSWORD_HINT}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmer</label>
          <input type="password" autoComplete="new-password" value={confirm}
            onChange={e => setConfirm(e.target.value)} className="input" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          {forced
            ? <button type="button" onClick={() => logout()} className="btn-secondary flex-1">Déconnexion</button>
            : <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>}
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Enregistrement…' : 'Valider'}
          </button>
        </div>
      </form>
    </div>
  );
};
