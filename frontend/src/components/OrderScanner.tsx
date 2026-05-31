import { useCallback, useEffect, useRef, useState } from "react";
import { Scan } from "lucide-react";

interface ScanResult {
  code: string;
  data: any;
}

interface Props {
  onScan: (code: string) => Promise<ScanResult | null>;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function OrderScanner({ onScan, placeholder = "扫描二维码...", disabled = false, autoFocus = true }: Props) {
  const [value, setValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastCode, setLastCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const triggerScan = useCallback(
    async (code: string) => {
      if (!code.trim() || scanning) return;
      setScanning(true);
      setLastCode(code);
      try {
        await onScan(code.trim());
      } finally {
        setScanning(false);
        setValue("");
        // Refocus after scan
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [onScan, scanning]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    // HID scanner sends Enter at end; detect by checking if value ends with \n
    // or use 300ms debounce for onChange-based detection
    debounceRef.current = setTimeout(() => {
      if (v.trim()) triggerScan(v);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      triggerScan(value);
    }
  };

  const refocus = () => {
    if (!disabled) inputRef.current?.focus();
  };

  return (
    <div className="relative" onClick={refocus}>
      <div className={`flex items-center border-2 rounded-xl bg-white transition-colors ${scanning ? "border-blue-400" : "border-gray-200 focus-within:border-blue-400"}`}>
        <Scan
          size={20}
          className={`ml-3 flex-shrink-0 transition-colors ${scanning ? "text-blue-500 animate-pulse" : "text-gray-400"}`}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Refocus after short delay to allow button clicks
            setTimeout(() => {
              if (document.activeElement !== inputRef.current && !disabled) {
                inputRef.current?.focus();
              }
            }, 200);
          }}
          className="flex-1 px-3 py-3 text-base outline-none bg-transparent"
          placeholder={scanning ? "识别中..." : placeholder}
          disabled={disabled || scanning}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="none"
        />
        {scanning && (
          <div className="mr-3 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
      </div>
      {lastCode && !scanning && (
        <p className="text-xs text-gray-400 mt-1 px-1 truncate">上次: {lastCode}</p>
      )}
    </div>
  );
}
