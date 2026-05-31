/**
 * @file ArchiveChatContainer.js
 * @description Синхронізований чат з float-timestamp підтримкою.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';

const ArchiveChatContainer = ({
  messages,
  currentTime,
  showSummary,
  setShowSummary,
  summaryFormat,
  topics,
  languages,
  paragraphSummary,
  isGenerating,
}) => {
  const chatContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('topics');
    console.log('ArchiveChatContainer render:', { messagesLength: messages?.length, currentTime });


  // ==================== ФІЛЬТРАЦІЯ ПОВІДОМЛЕНЬ ====================
  // currentTime — ціле число (секунди), timestamp у базі — float (18.658).
  // Порівнюємо напряму: 18.658 <= 18 → false, 18.658 <= 19 → true.
  // Тобто повідомлення з'являється як тільки currentTime досягає наступної секунди — ок.
  const visibleMessages = useMemo(() => {
  if (!messages || messages.length === 0) return [];
  
  console.log('Total messages:', messages.length);
  console.log('currentTime:', currentTime);
  console.log('First few timestamps:', messages.slice(0, 5).map(m => m.timestamp));
  
  return messages
    .filter((m) => {
      if (m.timestamp === null || m.timestamp === undefined) return false;
      const ts = typeof m.timestamp === 'number'
        ? m.timestamp
        : parseFloat(m.timestamp);
      return ts <= currentTime;
    })
    .slice(-100);
}, [messages, currentTime]);

  // Авто-скрол
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [visibleMessages.length]);

  const shouldShowAIButton = summaryFormat != null && summaryFormat !== 'none';

  // ==================== AI OVERLAY PANEL ====================
  const AIOverlay = () => {
    if (summaryFormat === 'none') return null;
    return (
      <div className="w-full h-full max-h-[700px] scrollable-y space-y-4 text-white pt-0 pl-2 pr-2 pb-24 font-sans">
        <div className="flex gap-4 border-b border-gray-600 pb-1 mb-2">
          <button
            onClick={() => setActiveTab('topics')}
            className={`text-[14px] font-semibold pb-1 border-b-2 transition-colors ${
              activeTab === 'topics' ? 'text-white border-white' : 'text-gray-400 border-transparent'
            }`}
          >
            Topics
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`text-[14px] font-semibold pb-1 border-b-2 transition-colors ${
              activeTab === 'summary' ? 'text-white border-white' : 'text-gray-400 border-transparent'
            }`}
          >
            Summary
          </button>
        </div>

        {activeTab === 'topics' ? (
          <div className="flex gap-8 mt-4">
            <div className="flex-[2]">
              <h4 className="text-sm font-semibold mb-2 text-gray-400">Main Topics:</h4>
              {isGenerating ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
              ) : topics?.length > 0 ? (
                <div className="space-y-2">
                  {topics.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span>{t.emoji}</span>
                      <span className="text-sm">{t.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No topics analyzed yet</p>
              )}
            </div>
            <div className="flex-1 border-l border-gray-700 pl-4">
              <h4 className="text-sm font-semibold mb-2 text-gray-400">Langs:</h4>
              {languages?.map((l, i) => (
                <div key={i} className="text-sm flex gap-1">
                  <span>{l.emoji}</span> {l.label}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm leading-relaxed text-gray-200">
            {isGenerating
              ? 'Analyzing stream context...'
              : paragraphSummary || 'Summary will appear here.'}
          </div>
        )}
      </div>
    );
  };

  // ==================== RENDER ====================
  return (
    <div className="archive-chat-wrapper flex flex-col h-full">
      <div className="relative w-[380px] h-[600px] bg-[#0f0f0f] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">

        {/* AI Overlay Layer */}
        {shouldShowAIButton && showSummary && (
          <div className="absolute inset-0 z-50 bg-black/95 p-4 transition-all animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowSummary(false)}
                className="btn btn-ghost btn-sm text-white"
              >
                ✕
              </button>
            </div>
            <AIOverlay />
          </div>
        )}

        {/* Top Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1a1a1a]">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
            Live Chat Replay
          </span>
          {!showSummary && shouldShowAIButton && (
            <button
              onClick={() => setShowSummary(true)}
              className="text-[11px] uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded font-bold transition-all"
            >
              AI Insights
            </button>
          )}
        </div>

        {/* Messages List */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100%-60px)] scrollbar-thin scrollbar-thumb-gray-700"
        >
          {visibleMessages.length > 0 ? (
            visibleMessages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className="flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300"
              >
                {msg.authorPhoto ? (
                  <img
                    src={msg.authorPhoto}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover mt-1"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-[10px] font-bold text-white mt-1">
                    {msg.author?.charAt(0)}
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-bold text-gray-300">{msg.author}</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {Math.floor(msg.timestamp / 60)}:{(Math.floor(msg.timestamp) % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-[14px] text-gray-100 leading-snug break-words">
                    {msg.message}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 px-10 text-center">
              <p className="text-sm italic">
                {currentTime === 0
                  ? 'Press play to start chat replay'
                  : `Waiting for messages at ${currentTime}s...`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchiveChatContainer;