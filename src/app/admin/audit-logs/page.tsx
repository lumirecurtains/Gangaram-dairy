"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/lib/components/layout/Navbar";
import { useAuth } from "@/lib/contexts";
import { Loader2, ClipboardList } from "lucide-react";
import { showToast } from "@/lib/components/common/Toast";

export default function AdminAuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  const fetchLogs = async (currentCursor: string | null = null) => {
    try {
      const token = await user?.getIdToken();
      let url = "/api/v1/admin/audit-logs?limit=50";
      if (currentCursor) {
        url += `&cursor=${currentCursor}`;
      }

      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (currentCursor) {
        setLogs(prev => [...prev, ...data.logs]);
      } else {
        setLogs(data.logs);
      }
      setCursor(data.nextCursor);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  return (
    <>
      <Navbar />
      <main className="flex-1 px-4 py-6 max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ClipboardList className="w-6 h-6" style={{ color: "var(--primary)" }} />
          System Audit Logs
        </h1>

        {loading && logs.length === 0 ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border mb-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                    <th className="p-4 font-semibold">Time</th>
                    <th className="p-4 font-semibold">Action</th>
                    <th className="p-4 font-semibold">Actor UID</th>
                    <th className="p-4 font-semibold">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const date = log.timestamp?.seconds 
                      ? new Date(log.timestamp.seconds * 1000).toLocaleString() 
                      : "Unknown";
                    
                    return (
                      <tr key={log.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                        <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{date}</td>
                        <td className="p-4 font-bold">{log.action}</td>
                        <td className="p-4 font-mono text-xs">{log.actorUid}</td>
                        <td className="p-4 font-mono text-xs">{log.targetPath}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {logs.length === 0 && <div className="p-8 text-center text-gray-500">No logs found.</div>}
            </div>

            {cursor && (
              <button 
                onClick={() => fetchLogs(cursor)}
                className="w-full py-3 rounded-lg font-bold transition-all hover:bg-gray-100 border border-gray-200"
              >
                Load More
              </button>
            )}
          </>
        )}
      </main>
    </>
  );
}
