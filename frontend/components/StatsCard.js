import { AreaChart, Area, ResponsiveContainer } from "recharts";

export default function StatsCard({ label, value, color, data }) {
  // data is an array of numbers (last 10 log scores or event counts)
  const chartData = data.map((val, idx) => ({ idx, value: val }));

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md hover:shadow-lg transition">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
      <div className="h-10 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color?.replace("text-", "") || "#3b82f6"}
              fill={`${color?.replace("text-", "") || "#3b82f6"}20`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
