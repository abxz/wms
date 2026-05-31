import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { api } from "../services/api";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationCombo({ value, onChange, placeholder = "使用地点", className = "" }: Props) {
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getLocationHistory().then((r: any) => setOptions(r.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(input.toLowerCase()));

  const select = (v: string) => {
    setInput(v);
    onChange(v);
    setOpen(false);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const clear = () => {
    setInput("");
    onChange("");
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="flex items-center border rounded-lg bg-white overflow-hidden">
        <input
          className="flex-1 px-3 py-2 text-sm outline-none min-w-0"
          placeholder={placeholder}
          value={input}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
        />
        {input && (
          <button type="button" onClick={clear} className="px-2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="px-2 py-2 text-gray-400 hover:text-gray-600 border-l"
        >
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 && input && (
            <button
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50"
              onClick={() => select(input)}
            >
              使用「{input}」
            </button>
          )}
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 active:bg-gray-100"
              onClick={() => select(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
