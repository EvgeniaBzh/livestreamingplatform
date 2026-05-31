/**
 * @file SmartAnalysisPanel.jsx
 * @description UI панель для Smart mode з кнопками download report та generate summary —
 * аналогічно до baseline панелі.
 */

import React, { useState } from 'react';

const THRESHOLD = 0.65;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function ScoreBar({ score }) {
  const pct = Math.round(score * 100);
  const color =
    score >= THRESHOLD ? '#22c55e'
    : score >= 0.4 ? '#f59e0b'
    : '#6b7280';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1,
        height: 6,
        background: '#1f2937',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          transition: 'width 0.5s ease, background 0.3s',
        }} />
      </div>
      <span style={{
        fontFamily: 'monospace',
        fontSize: 12,
        color,
        minWidth: 36,
        textAlign: 'right',
      }}>
        {pct}%
      </span>
    </div>
  );
}

export default function SmartAnalysisPanel({
  currentScore,
  currentKeywords,
  isScoring,
  isAnalyzingVideo,
  lastInsight,
  totalTriggered,
  smartLog,
  streamSummary,
  isGeneratingSummary,
  downloadSmartReport,
  generateSmartSummary,
  downloadSummaryTxt,
}) {
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid #1a2e1a',
      borderRadius: 10,
      padding: 16,
      fontFamily: 'monospace',
      fontSize: 12,
      color: '#86efac',
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: '1px solid #1a2e1a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isScoring || isAnalyzingVideo ? '#22c55e' : '#374151',
            display: 'inline-block',
            boxShadow: isScoring || isAnalyzingVideo ? '0 0 6px #22c55e' : 'none',
          }} />
          <span style={{ color: '#f0fdf4', fontWeight: 'bold', letterSpacing: '0.05em' }}>
            SMART MODE — Chat-Triggered Analysis
          </span>
        </div>

        {/* Кнопки — аналогічно baseline */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#4b5563', fontSize: 11 }}>
            {totalTriggered} trigger{totalTriggered !== 1 ? 's' : ''}
          </span>

          {totalTriggered > 0 && (
            <button
              onClick={downloadSmartReport}
              style={{
                background: 'transparent',
                border: '1px solid #166534',
                color: '#86efac',
                borderRadius: 4,
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              ↓ JSON report
            </button>
          )}

          {totalTriggered > 0 && !isGeneratingSummary && (
            <button
              onClick={generateSmartSummary}
              style={{
                background: 'transparent',
                border: '1px solid #6b21a8',
                color: '#c084fc',
                borderRadius: 4,
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              Generate Summary
            </button>
          )}

          {isGeneratingSummary && (
            <span style={{ color: '#c084fc', fontSize: 11, fontStyle: 'italic' }}>
              generating...
            </span>
          )}
        </div>
      </div>

      {/* Live score */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#6b7280', fontSize: 11 }}>EMOTION SCORE</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {isScoring && (
              <span style={{ color: '#4b5563', fontSize: 11, fontStyle: 'italic' }}>scoring...</span>
            )}
            {isAnalyzingVideo && (
              <span style={{ color: '#22c55e', fontSize: 11, fontStyle: 'italic' }}>
                ● analyzing video clip...
              </span>
            )}
          </div>
        </div>
        <ScoreBar score={currentScore} />
        {currentKeywords.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {currentKeywords.map((kw, i) => (
              <span key={i} style={{
                background: '#14532d',
                color: '#86efac',
                padding: '1px 6px',
                borderRadius: 3,
                fontSize: 10,
              }}>
                {kw}
              </span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 6, fontSize: 10, color: '#374151' }}>
          <span style={{ color: currentScore >= THRESHOLD ? '#22c55e' : '#374151' }}>▶</span>
          {' '}Threshold: {Math.round(THRESHOLD * 100)}% — відео аналізується вище цього рівня
        </div>
      </div>

      {/* Stream Summary (аналогічно baseline) */}
      {streamSummary && (
        <div style={{
          background: '#0d0d1a',
          border: '1px solid #6b21a8',
          borderRadius: 6,
          marginBottom: 12,
          overflow: 'hidden',
        }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              cursor: 'pointer',
            }}
            onClick={() => setSummaryCollapsed(!summaryCollapsed)}
          >
            <span style={{ color: '#c084fc', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              📋 Smart Stream Summary {summaryCollapsed ? '▶' : '▼'}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={(e) => { e.stopPropagation(); downloadSummaryTxt(); }}
                style={{
                  background: 'transparent',
                  border: '1px solid #4b5563',
                  color: '#9ca3af',
                  borderRadius: 4,
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: 10,
                }}
              >
                ↓ .txt
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); /* parent clears summary */ }}
                style={{
                  background: 'transparent',
                  border: '1px solid #4b5563',
                  color: '#9ca3af',
                  borderRadius: 4,
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: 10,
                }}
              >
                ✕
              </button>
            </div>
          </div>
          {!summaryCollapsed && (
            <div style={{ padding: '0 12px 12px' }}>
              <pre style={{
                color: '#e9d5ff',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                margin: 0,
                fontSize: 11,
              }}>
                {streamSummary}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Last insight */}
      {lastInsight && (
        <div style={{
          background: '#0d1f0d',
          border: '1px solid #166534',
          borderRadius: 6,
          padding: 10,
          marginBottom: 12,
        }}>
          <p style={{ color: '#4ade80', fontSize: 11, margin: '0 0 4px', fontWeight: 'bold' }}>
            LAST MOMENT INSIGHT
          </p>
          <p style={{ color: '#d1fae5', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            {lastInsight.insight}
          </p>
        </div>
      )}

      {/* Event log */}
      {smartLog.length > 0 && (
        <div style={{ maxHeight: 160, overflowY: 'auto' }}>
          <p style={{ color: '#374151', fontSize: 10, margin: '0 0 6px' }}>EVENT LOG</p>
          {smartLog.slice(0, 15).map((entry) => (
            <div key={entry.id} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '4px 0',
              borderBottom: '1px solid #111',
            }}>
              <span style={{ color: '#6b7280', minWidth: 36, fontSize: 11 }}>
                {formatTime(entry.videoTime)}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    color: entry.score >= THRESHOLD ? '#22c55e' : '#6b7280',
                    fontWeight: entry.score >= THRESHOLD ? 'bold' : 'normal',
                  }}>
                    {Math.round(entry.score * 100)}%
                  </span>
                  {entry.status === 'done' && (
                    <span style={{ color: '#16a34a', fontSize: 10 }}>✓ analyzed</span>
                  )}
                  {entry.status === 'analyzing' && (
                    <span style={{ color: '#ca8a04', fontSize: 10 }}>⟳ analyzing</span>
                  )}
                  {entry.status === 'error' && (
                    <span style={{ color: '#dc2626', fontSize: 10 }}>✗ error</span>
                  )}
                  {entry.status === 'scored' && (
                    <span style={{ color: '#374151', fontSize: 10 }}>— below threshold</span>
                  )}
                </div>
                {entry.reason && (
                  <p style={{ color: '#4b5563', fontSize: 10, margin: '2px 0 0' }}>
                    {entry.reason}
                  </p>
                )}
                {entry.insight && (
                  <p style={{ color: '#86efac', fontSize: 10, margin: '3px 0 0', lineHeight: 1.4 }}>
                    {entry.insight}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}