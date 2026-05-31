import { useState } from "react";
import BarcodeScanner from "../components/BarcodeScanner";
import { useNavigate } from "react-router-dom";

export default function Scanner() {
  const [code, setCode] = useState("");
  const nav = useNavigate();

  const handleScan = (c: string) => {
    setCode(c);
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">📷 扫码</h1>
      {!code ? (
        <BarcodeScanner onScan={handleScan} />
      ) : (
        <div className="text-center py-8">
          <p className="text-2xl font-bold text-green-600 mb-4">✅ {code}</p>
          <p className="text-sm text-gray-400 mb-6">已识别条码</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => nav(`/inventory?search=${code}`)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">查库存</button>
            <button onClick={() => setCode("")} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">继续扫码</button>
          </div>
        </div>
      )}
    </div>
  );
}
