/**
 * @file YoutubeLiveChatOverlay.js
 * @author Jonas Matulis
 * @description AI summary component with original styling + toggle
 */

import { useState, useEffect } from 'react';

const YouTubeLiveChatOverlay = ({ chatSrc }) => {
  const [overlayText, setOverlayText] = useState('Loading summary...');
  const [topics, setTopics] = useState([]);
  const [languages, setLanguages] = useState([]);
  
  // Вкладка за замовчуванням - 'details' (ваші стовпчики)
  const [activeTab, setActiveTab] = useState('details');

  const parseLabelEmojiPairs = (input) => {
    if (!input) return [];
    const regex = /"([^"]+)"\s+([\p{Emoji_Presentation}\p{Extended_Pictographic}]{1,2})/gu;
    const matches = [...input.matchAll(regex)];
    return matches.map((match) => ({
      label: match[1],
      emoji: match[2],
    }));
  };

  const updateOverlayText = async (chatSrc) => {
    try {
      const response = await fetch(
        'http://localhost:8080/api/getVideoAnalysis',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatSrc }),
        }
      );

      if (!response.ok) throw new Error('API call failed');

      const data = await response.json();

      setOverlayText(data.summary || 'Summary not available yet.');
      setLanguages(parseLabelEmojiPairs(data.languages || ''));
      setTopics(parseLabelEmojiPairs(data.topics || ''));

    } catch (error) {
      console.error('Error updating overlay text:', error);
      setOverlayText('Waiting for analysis...');
    }
  };

  useEffect(() => {
    updateOverlayText(chatSrc);
    const interval = setInterval(() => {
      updateOverlayText(chatSrc);
    }, 30000); 
    return () => clearInterval(interval);
  }, [chatSrc]);

  return (
    <div className="w-full h-full max-h-[700px] scrollable-y space-y-4 text-white pt-0 pl-2 pr-2 pb-24">
      
      {/* --- Simple Tab Switcher --- */}
      <div className="flex gap-4 mb-2 border-b border-white/20 pb-1">
        <button
          onClick={() => setActiveTab('details')}
          className={`text-sm font-semibold transition-colors ${
            activeTab === 'details' ? 'text-white border-b-2 border-primary' : 'text-gray-400 hover:text-white'
          }`}
        >
          Topics
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`text-sm font-semibold transition-colors ${
            activeTab === 'summary' ? 'text-white border-b-2 border-primary' : 'text-gray-400 hover:text-white'
          }`}
        >
          Summary
        </button>
      </div>

      {/* --- CONTENT --- */}
      
      {/* VIEW 1: Original Style Topics (Один в один як у вашому коді) */}
      {activeTab === 'details' && (
        <div className="flex gap-8 mt-4 overflow-auto">
          {/* Topics - more space */}
          <div className="flex-[2] overflow-auto pr-0">
            <h3 className="text-md font-semibold mb-2">Topics:</h3>
            {topics.length ? (
              <ul className="text-sm space-y-1 pl-0 list-none">
                {topics.map((t, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-xl">{t.emoji}</span>
                    <span>{t.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base">No topics found</p>
            )}
          </div>

          {/* Languages - slightly less space */}
          <div className="flex-1 max-h-[500px] overflow-y-auto pr-4">
            <h3 className="text-md font-semibold mb-2">Languages:</h3>
            {languages.length ? (
              <ul className="text-sm space-y-2 pl-0 list-none">
                {languages.map((l, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <span className="text-xl">{l.emoji}</span>
                    <span>{l.label}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base">No languages found</p>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Simple Paragraph Text */}
      {activeTab === 'summary' && (
        <div className="mt-4">
            <h3 className="text-md font-semibold mb-2">Live Summary:</h3>
            <p className="text-sm font-light leading-relaxed text-gray-200 whitespace-pre-wrap">
                {overlayText}
            </p>
        </div>
      )}

    </div>
  );
};

export default YouTubeLiveChatOverlay;