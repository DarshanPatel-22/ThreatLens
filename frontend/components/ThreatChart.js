import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ThreatChart({ logs }) {
  const [mode, setMode] = useState("score");
  const data = useMemo(() => {
    const bucket = {};
    logs.forEach((log) => {
      const key = log.time;
      if (!bucket[key]) bucket[key] = { count: 0, totalScore: 0 };
      bucket[key].count++;
      bucket[key].totalScore += log.log_score || 0;
    });
    return Object.entries(bucket)
      .slice(-10)
      .map(([name, { count, totalScore }]) => ({
        name,
        frequency: count,
        avgScore: Math.round(totalScore / count),
      }));
  }, [logs]);

  const chartData = data.map((d) => ({
    name: d.name,
    value: mode === "score" ? d.avgScore : d.frequency,
  }));

  return (
    <div className="h-72">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg text-white">
          {mode === "score"
            ? "Threat Intensity (avg score/sec)"
            : "Event Frequency (count/sec)"}
        </h2>
        <button
          onClick={() => setMode(mode === "score" ? "frequency" : "score")}
          className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded text-white"
        >
          Switch to {mode === "score" ? "Frequency" : "Score"} View
        </button>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis dataKey="name" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip />
          <Bar
            dataKey="value"
            fill={mode === "score" ? "#f97316" : "#3b82f6"}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
