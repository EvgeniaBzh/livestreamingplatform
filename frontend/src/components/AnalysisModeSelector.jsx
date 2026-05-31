/**
 * @file AnalysisModeSelector.jsx
 * @description Toggle between Baseline (every second) and Smart (chat-triggered) analysis.
 * Drop into components, use in ArchivePage.js near the AI Monitor Panel.
 */

import React from 'react';

export default function AnalysisModeSelector({ mode, onChange }) {
  const isBaseline = mode === 'baseline';
  const isSmart = mode === 'smart';
  const isOff = mode === 'off';

  const btnBase = {
    border: '1px solid',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 12,
    fontFamily: 'monospace',
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: '0.04em',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      background: '#0a0a0a',
      border: '1px solid #1f2937',
      borderRadius: 8,
      marginBottom: 12,
    }}>
      <span style={{ color: '#4b5563', fontSize: 11, fontFamily: 'monospace', marginRight: 4 }}>
        AI MODE:
      </span>

      {/* OFF */}
      <button
        style={{
          ...btnBase,
          background: isOff ? '#1f2937' : 'transparent',
          borderColor: isOff ? '#6b7280' : '#1f2937',
          color: isOff ? '#d1d5db' : '#374151',
        }}
        onClick={() => onChange('off')}
        title="No AI analysis"
      >
        OFF
      </button>

      {/* BASELINE */}
      <button
        style={{
          ...btnBase,
          background: isBaseline ? '#1e3a5f' : 'transparent',
          borderColor: isBaseline ? '#3b82f6' : '#1f2937',
          color: isBaseline ? '#93c5fd' : '#374151',
          boxShadow: isBaseline ? '0 0 8px rgba(59,130,246,0.25)' : 'none',
        }}
        onClick={() => onChange('baseline')}
        title="Analyze every second — high resource usage"
      >
        ● BASELINE
      </button>

      {/* SMART */}
      <button
        style={{
          ...btnBase,
          background: isSmart ? '#14532d' : 'transparent',
          borderColor: isSmart ? '#22c55e' : '#1f2937',
          color: isSmart ? '#86efac' : '#374151',
          boxShadow: isSmart ? '0 0 8px rgba(34,197,94,0.25)' : 'none',
        }}
        onClick={() => onChange('smart')}
        title="Analyze video only when chat gets excited — resource efficient"
      >
        ◆ SMART
      </button>

      {/* Mode description */}
      <span style={{ color: '#374151', fontSize: 10, fontFamily: 'monospace', marginLeft: 4 }}>
        {isOff && 'No analysis running'}
        {isBaseline && 'Video analyzed every ~1s — high cost'}
        {isSmart && 'Video triggered by chat emotion score ≥ 65%'}
      </span>
    </div>
  );
}