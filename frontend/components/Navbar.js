import { useState } from "react";

export default function Navbar({ onToggleAssistant }) {
  const [activeMenu, setActiveMenu] = useState("Dashboard");

  const menuItems = ["Dashboard", "Alerts", "Logs", "Threat Intel", "Settings"];

  return (
    <div className="bg-slate-900/70 backdrop-blur-md border-b border-slate-800 px-6 py-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-semibold text-white">
            🛡 SOC Command Center
          </h1>
          <div className="hidden md:flex gap-4">
            {menuItems.map((item) => (
              <button
                key={item}
                onClick={() => setActiveMenu(item)}
                className={`text-sm px-3 py-1 rounded transition ${
                  activeMenu === item
                    ? "bg-red-600 text-white"
                    : "text-gray-300 hover:text-white hover:bg-slate-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={onToggleAssistant}
            className="text-gray-300 hover:text-white text-sm bg-slate-700 px-3 py-1 rounded"
          >
            🤖 Assistant
          </button>
          <span className="text-gray-400 text-sm">Admin • Live Monitoring</span>
        </div>
      </div>
      {/* Mobile menu (collapsible) */}
      <div className="md:hidden flex gap-3 mt-3 overflow-x-auto pb-2">
        {menuItems.map((item) => (
          <button
            key={item}
            onClick={() => setActiveMenu(item)}
            className={`text-xs px-3 py-1 rounded whitespace-nowrap ${
              activeMenu === item
                ? "bg-red-600 text-white"
                : "bg-slate-800 text-gray-300"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
