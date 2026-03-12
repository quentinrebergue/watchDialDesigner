import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/70 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpen(!open)}>
        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {action}
          <button
            onClick={() => setOpen(!open)}
            className="text-gray-400 hover:text-gray-600"
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {open && children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      {children}
    </div>
  );
}
