export default function Sidebar({ collapsed }) {
  return (
    <div
      className={`${collapsed ? "w-20" : "w-64"} bg-slate-900/80 backdrop-blur-md border-r border-slate-800 h-screen p-4 text-white transition-all duration-300`}
    >
      <h2
        className={`text-xl font-bold mb-6 ${collapsed ? "hidden" : "block"}`}
      >
        🛡 SOC Panel
      </h2>
      <ul className="space-y-4 text-gray-300">
        <li className="hover:text-red-400 cursor-pointer">
          {collapsed ? "📊" : "📊 Dashboard"}
        </li>
        <li className="hover:text-red-400 cursor-pointer">
          {collapsed ? "🚨" : "🚨 Alerts"}
        </li>
        <li className="hover:text-red-400 cursor-pointer">
          {collapsed ? "📡" : "📡 Logs"}
        </li>
        <li className="hover:text-red-400 cursor-pointer">
          {collapsed ? "🌍" : "🌍 Threat Intel"}
        </li>
        <li className="hover:text-red-400 cursor-pointer">
          {collapsed ? "⚙" : "⚙ Settings"}
        </li>
      </ul>
    </div>
  );
}
