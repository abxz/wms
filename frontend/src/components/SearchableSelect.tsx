import { useState, useRef, useEffect, useCallback } from "react";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  options: SearchableOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "搜索选择...",
  label,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当前选中项的显示文本
  const selected = options.find((o) => o.value === value);

  // 过滤
  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 键盘
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          setOpen(true);
          e.preventDefault();
        }
        return;
      }
      if (e.key === "ArrowDown") {
        setHighlight((h) => Math.min(h + 1, filtered.length - 1));
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setHighlight((h) => Math.max(h - 1, 0));
        e.preventDefault();
      } else if (e.key === "Enter") {
        if (filtered[highlight]) {
          onChange(filtered[highlight].value);
          setOpen(false);
          setQuery("");
        }
        e.preventDefault();
      } else if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    },
    [open, filtered, highlight, onChange]
  );

  // 选中某项
  const selectOption = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        className="w-full border rounded-lg p-2 text-sm"
        placeholder={placeholder}
        value={open ? query : selected?.label || ""}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onKeyDown={handleKeyDown}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 bg-white shadow-lg max-h-60 overflow-y-auto border rounded-lg mt-1 w-full">
          {filtered.map((opt, idx) => (
            <div
              key={opt.value}
              className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center ${
                idx === highlight ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
              onMouseEnter={() => setHighlight(idx)}
              onClick={() => selectOption(opt.value)}
            >
              <span className="font-medium">{opt.label}</span>
              {opt.sublabel && (
                <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                  {opt.sublabel}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-50 bg-white shadow-lg border rounded-lg mt-1 w-full px-3 py-2 text-sm text-gray-400">
          无匹配项
        </div>
      )}
    </div>
  );
}
