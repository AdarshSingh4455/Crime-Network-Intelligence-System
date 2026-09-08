import React, { useState, useEffect } from 'react';
import { Search, X, Users, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity?: (entityId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectEntity,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sampleEntities = [
    { id: 'Suresh Nair', type: 'PERSON', role: 'Key Influencer' },
    { id: 'Deepak Shah', type: 'PERSON', role: 'Bridge Node' },
    { id: 'Ravi Malhotra', type: 'PERSON', role: 'Key Influencer' },
    { id: 'Global Traders Pvt Ltd', type: 'ORG', role: 'Front Organization' },
    { id: 'Andheri Warehouse', type: 'LOCATION', role: 'Primary Hub' },
    { id: 'MH12AB1234', type: 'VEHICLE', role: 'Observed Vehicle' },
    { id: '+91-9876543210', type: 'PHONE', role: 'Burst Calling Line' },
  ];

  const filtered = query.trim()
    ? sampleEntities.filter(
        (e) =>
          e.id.toLowerCase().includes(query.toLowerCase()) ||
          e.type.toLowerCase().includes(query.toLowerCase())
      )
    : sampleEntities;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-cyan-700" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type entity name, phone number, vehicle plate, or record ID..."
            className="flex-1 bg-transparent border-none text-slate-900 text-sm focus:outline-none placeholder-slate-400 font-sans"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-1 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            Entities & Intelligence Mentions ({filtered.length})
          </div>
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No entities matching "{query}" found in intelligence graph.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (onSelectEntity) onSelectEntity(item.id);
                  onClose();
                }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-cyan-700 group-hover:bg-cyan-50">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-cyan-800">
                      {item.id}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                      <span>TYPE: {item.type}</span>
                      <span>•</span>
                      <span>{item.role}</span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-700 group-hover:translate-x-1 transition-all" />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div>CNIS Global Intelligence Search</div>
          <div>Press ESC to close</div>
        </div>
      </div>
    </div>
  );
};
