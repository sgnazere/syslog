import { useState, useRef, useEffect } from 'react';
import { Employee } from '../../types';

interface Props {
  employees: Employee[];
  selected: number[];
  onChange: (ids: number[]) => void;
  excludeId?: number;        // l'initiateur — exclu de la liste
  placeholder?: string;
}

export const MultiSelectPassagers = ({
  employees, selected, onChange, excludeId, placeholder = 'Ajouter des passagers…'
}: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer si clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const available = employees.filter(e =>
    e.id !== excludeId &&
    (search === '' ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.poste || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.projet || '').toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const removeTag = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(x => x !== id));
  };

  const selectedEmployees = employees.filter(e => selected.includes(e.id));

  return (
    <div ref={containerRef} className="relative">
      {/* Champ principal */}
      <div
        onClick={() => setOpen(o => !o)}
        className={`min-h-[42px] w-full px-3 py-2 border rounded-lg cursor-pointer flex flex-wrap gap-1.5 items-center transition-all
          ${open ? 'border-primary ring-2 ring-primary/20' : 'border-slate-300 hover:border-slate-400'}`}
      >
        {selectedEmployees.length === 0 ? (
          <span className="text-sm text-slate-400 select-none">{placeholder}</span>
        ) : (
          selectedEmployees.map(emp => (
            <span key={emp.id}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
              {emp.name}
              <button onClick={e => removeTag(emp.id, e)}
                className="hover:bg-primary/20 rounded-full w-3.5 h-3.5 flex items-center justify-center flex-shrink-0 text-primary/70 hover:text-primary">
                ×
              </button>
            </span>
          ))
        )}
        <span className="ml-auto text-slate-400 text-sm select-none">{open ? '▲' : '▼'}</span>
      </div>

      {/* Compteur */}
      {selected.length > 0 && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-slate-500">
            {selected.length} passager{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
          </span>
          <button onClick={() => onChange([])} className="text-xs text-red-500 hover:underline">
            Tout retirer
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Recherche */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un employé…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Liste */}
          <div className="max-h-52 overflow-y-auto">
            {available.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                {search ? 'Aucun résultat' : 'Aucun employé disponible'}
              </div>
            ) : available.map(emp => {
              const isSelected = selected.includes(emp.id);
              return (
                <div key={emp.id} onClick={() => toggle(emp.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                    ${isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'}`}>
                  {/* Checkbox visuel */}
                  <div className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-colors
                    ${isSelected ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  {/* Avatar initiales */}
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {emp.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  {/* Infos */}
                  <div className="min-w-0">
                    <div className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-slate-800'}`}>
                      {emp.name}
                    </div>
                    {(emp.poste || emp.projet) && (
                      <div className="text-xs text-slate-400 truncate">
                        {emp.poste || ''}{emp.poste && emp.projet ? ' — ' : ''}{emp.projet || ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {available.length > 0 && (
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-400">{available.length} employé{available.length > 1 ? 's' : ''}</span>
              <button onClick={() => setOpen(false)}
                className="text-xs font-medium text-primary hover:underline">
                Fermer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
