import { useRef, useState } from "react";
import { ScanBarcode } from "lucide-react";

interface Props {
  /** Called when a barcode is scanned/submitted */
  onScan: (code: string) => void;
  placeholder?: string;
}

/**
 * PDA-friendly scan input.
 * PDA hardware scan keys inject characters then fire Enter automatically.
 * This component relies on that system-level behaviour:
 *   1. Focus the input
 *   2. PDA injects barcode text + Enter
 *   3. onScan fires with the code
 *   4. Input clears & re-focuses for next scan
 */
export default function ScanInput({ onScan, placeholder = "扫描条码..." }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const code = value.trim();
    if (code) {
      onScan(code);
      setValue("");
      // Re-focus for next scan
      setTimeout(() => ref.current?.focus(), 50);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 w-full max-w-md">
      <ScanBarcode size={20} className="text-gray-400 flex-shrink-0" />
      <input
        ref={ref}
        className="flex-1 text-sm outline-none bg-transparent"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
        autoFocus
      />
      {value && (
        <button
          type="button"
          onClick={handleSubmit}
          className="text-xs text-blue-500 font-medium px-2 py-1 rounded hover:bg-blue-50"
        >
          确认
        </button>
      )}
    </div>
  );
}
