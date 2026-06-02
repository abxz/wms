import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
