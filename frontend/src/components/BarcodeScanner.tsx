import { useEffect, useRef, useState } from "react";

interface Props {
  onScan: (code: string) => void;
  onClose?: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let scanner: any;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      scanner = new Html5Qrcode("scanner-el");
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (code: string) => {
            onScan(code);
            scanner?.stop().catch(() => {});
          }
        );
        setReady(true);
      } catch {
        setReady(false);
      }
    })();
    return () => { scanner?.stop().catch(() => {}); };
  }, []);

  return (
    <div className="relative">
      <div id="scanner-el" ref={ref} className="w-full aspect-square bg-black rounded-xl overflow-hidden" />
      {!ready && <p className="text-center text-sm text-gray-500 mt-2">正在启动摄像头...</p>}
      {onClose && (
        <button onClick={onClose} className="mt-3 w-full py-2 bg-red-500 text-white rounded-lg">关闭</button>
      )}
    </div>
  );
}
