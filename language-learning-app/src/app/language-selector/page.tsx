"use client";

import React from "react";

// Lista di esempio — puoi passare questa da un'API, props, ecc.
const allButtons = ["Pulsante 1", "Pulsante 2", "Pulsante 3", "Pulsante 4"]; // fare la get dalla tabella per tutti quelli da visualizzare
const enabledButtons = ["Pulsante 1", "Pulsante 3"];

export default function ButtonsPage() {
  const handleClick = (label: string) => {
    alert(`Hai cliccato: ${label}`);
  };

  const buttons = allButtons.map((label) => ({
    label,
    enabled: enabledButtons.includes(label),
  }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="flex flex-wrap flex-col justify-center gap-4 w-4/5 h-3/5">
        {buttons.map(({ label, enabled }, index) => (
          <button
            key={index}
            onClick={() => enabled && handleClick(label)}
            disabled={!enabled}
            className={`w-2/3 px-6 py-3 rounded transition 
              ${
                enabled
                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  : "bg-gray-400 text-white cursor-not-allowed"
              }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
