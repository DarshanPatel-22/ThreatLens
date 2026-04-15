import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import io from "socket.io-client";
import { Toaster, toast } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Navbar from "../components/Navbar";
import ThreatChart from "../components/ThreatChart";
import WorldMap from "../components/WorldMap";
import StatsCard from "../components/StatsCard";
import AssistantPanel from "../components/AssistantPanel";

export default function Home() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState(24);
  const [anomalies, setAnomalies] = useState([]);
  const [showAssistant, setShowAssistant] = useState(true);
  const [sortField, setSortField] = useState("time");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!localStorage.getItem("auth")) router.push("/login");
    fetchLogs();
    const socket = io("http://127.0.0.1:5000");
    socket.on("new_log", (log) => {
      setLogs((prev) => {
        const newLogs = [log, ...prev.slice(0, 199)];
        if (log.severity === "CRITICAL")
          toast.error(`🚨 CRITICAL: ${log.event} from ${log.ip}`);
        return newLogs;
      });
    });
    return () => socket.disconnect();
  }, [timeRange]);

  const fetchLogs = async () => {
    try {
      const res = await fetch(
        `http://127.0.0.1:5000/api/logs?hours=${timeRange}`,
      );
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  const exportCSV = () => {
    const headers = ["Time", "Event", "IP", "Severity", "Score", "MITRE"];
    const rows = filteredSortedLogs.map((l) => [
      l.time,
      l.event,
      l.ip,
      l.severity,
      l.log_score,
      l.mitre_technique,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "incidents.csv";
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Incident Report", 14, 10);
    autoTable(doc, {
      head: [["Time", "Event", "IP", "Severity", "Score"]],
      body: filteredSortedLogs
        .slice(0, 20)
        .map((l) => [l.time, l.event, l.ip, l.severity, l.log_score]),
    });
    doc.save("incidents.pdf");
  };

  const handleSort = (field) => {
    if (sortField === field)
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredSortedLogs = logs
    .filter(
      (l) =>
        l.ip.includes(search) && (filter === "ALL" || l.severity === filter),
    )
    .sort((a, b) => {
      let aVal = a[sortField],
        bVal = b[sortField];
      if (sortField === "time") ((aVal = a.time), (bVal = b.time));
      if (sortDirection === "asc") return aVal > bVal ? 1 : -1;
      else return aVal < bVal ? 1 : -1;
    });

  const paginatedLogs = filteredSortedLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const totalPages = Math.ceil(filteredSortedLogs.length / pageSize);

  const stats = {
    total: logs.length,
    critical: logs.filter((l) => l.severity === "CRITICAL").length,
    high: logs.filter((l) => l.severity === "HIGH").length,
    medium: logs.filter((l) => l.severity === "MEDIUM").length,
    low: logs.filter((l) => l.severity === "LOW").length,
  };

  const lastScores = logs.slice(0, 10).map((l) => l.log_score || 0);
  const topAttackers = Object.entries(
    logs.reduce((acc, log) => {
      acc[log.ip] = (acc[log.ip] || 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="bg-[#0b1220] min-h-screen text-white">
      <Toaster position="top-right" />
      <Navbar onToggleAssistant={() => setShowAssistant(!showAssistant)} />
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard
            label="Total Events"
            value={stats.total}
            color="text-white"
            data={lastScores}
          />
          <StatsCard
            label="Critical"
            value={stats.critical}
            color="text-red-400"
            data={logs
              .filter((l) => l.severity === "CRITICAL")
              .slice(0, 10)
              .map((l) => l.log_score)}
          />
          <StatsCard
            label="High"
            value={stats.high}
            color="text-orange-400"
            data={logs
              .filter((l) => l.severity === "HIGH")
              .slice(0, 10)
              .map((l) => l.log_score)}
          />
          <StatsCard
            label="Medium"
            value={stats.medium}
            color="text-yellow-300"
            data={logs
              .filter((l) => l.severity === "MEDIUM")
              .slice(0, 10)
              .map((l) => l.log_score)}
          />
          <StatsCard
            label="Low"
            value={stats.low}
            color="text-green-400"
            data={logs
              .filter((l) => l.severity === "LOW")
              .slice(0, 10)
              .map((l) => l.log_score)}
          />
        </div>

        {/* Chart + Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <ThreatChart logs={logs} />
          </div>
          <WorldMap logs={logs} />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search IP..."
            className="p-2 rounded bg-slate-700 text-white"
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-700 p-2 rounded text-white"
          >
            <option value="ALL">All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            className="bg-slate-700 p-2 rounded text-white"
          >
            <option value={24}>Last 24h</option>
            <option value={6}>Last 6h</option>
            <option value={1}>Last 1h</option>
          </select>
          <button
            onClick={exportCSV}
            className="bg-green-600 px-4 py-2 rounded"
          >
            📥 CSV
          </button>
          <button onClick={exportPDF} className="bg-red-600 px-4 py-2 rounded">
            📄 PDF
          </button>
          <button
            onClick={() =>
              fetch("/api/anomalies")
                .then((r) => r.json())
                .then((d) => setAnomalies(d.anomalies))
            }
            className="bg-purple-600 px-4 py-2 rounded"
          >
            🔍 Detect Anomalies
          </button>
        </div>

        {/* Anomalies Panel */}
        {anomalies.length > 0 && (
          <div className="bg-yellow-900/30 p-4 rounded-xl border border-yellow-700">
            <h2 className="text-lg font-semibold text-yellow-300">
              ⚠️ Anomalies Detected
            </h2>
            <ul>
              {anomalies.slice(0, 5).map((a, i) => (
                <li key={i}>
                  {a.time} - {a.ip} - {a.event}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Critical + Top Attackers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-900/20 p-4 rounded-xl border border-red-700">
            <h2 className="text-lg mb-3 font-semibold text-red-300">
              🚨 Critical Alerts
            </h2>
            {logs.filter((l) => l.severity === "CRITICAL").length === 0 ? (
              <p className="text-gray-400">None</p>
            ) : (
              logs
                .filter((l) => l.severity === "CRITICAL")
                .slice(0, 5)
                .map((log, i) => (
                  <div key={i} className="border-b border-red-700 py-1 text-sm">
                    {log.time} - {log.event} ({log.ip})
                  </div>
                ))
            )}
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <h2 className="text-lg mb-3 font-semibold">🧠 Top Attackers</h2>
            {topAttackers.map(([ip, count], i) => (
              <div
                key={i}
                className="flex justify-between border-b border-slate-700 py-1"
              >
                <span>{ip}</span>
                <span
                  className={
                    i === 0 ? "text-red-400 font-bold" : "text-gray-300"
                  }
                >
                  {count} events
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Incident Table with sorting & pagination */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h2 className="text-lg mb-4 font-semibold">Incident Queue</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-slate-700">
                  <th
                    className="py-2 text-left cursor-pointer"
                    onClick={() => handleSort("time")}
                  >
                    Time{" "}
                    {sortField === "time" &&
                      (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="py-2 text-left cursor-pointer"
                    onClick={() => handleSort("event")}
                  >
                    Event
                  </th>
                  <th
                    className="py-2 text-left cursor-pointer"
                    onClick={() => handleSort("ip")}
                  >
                    IP
                  </th>
                  <th
                    className="py-2 text-left cursor-pointer"
                    onClick={() => handleSort("severity")}
                  >
                    Severity
                  </th>
                  <th
                    className="py-2 text-left cursor-pointer"
                    onClick={() => handleSort("log_score")}
                  >
                    Score
                  </th>
                  <th className="py-2 text-left">MITRE</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-800 hover:bg-slate-700/40 ${log.severity === "CRITICAL" ? "bg-red-900/40" : ""}`}
                  >
                    <td className="py-2">{log.time}</td>
                    <td className="py-2">{log.event}</td>
                    <td className="py-2">{log.ip}</td>
                    <td
                      className={
                        log.severity === "CRITICAL"
                          ? "text-red-400 font-semibold"
                          : log.severity === "HIGH"
                            ? "text-orange-400"
                            : log.severity === "MEDIUM"
                              ? "text-yellow-300"
                              : "text-green-400"
                      }
                    >
                      {log.severity}
                    </td>
                    <td className="py-2">{log.log_score || "-"}</td>
                    <td className="py-2 font-mono text-xs">
                      {log.mitre_technique}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="bg-slate-700 px-3 py-1 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="bg-slate-700 px-3 py-1 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {showAssistant && <AssistantPanel logs={logs} />}
    </div>
  );
}
