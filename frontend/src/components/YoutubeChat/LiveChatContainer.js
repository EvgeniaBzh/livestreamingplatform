/**
 * @file LiveChatContainer.js
 * @author Jonas Matulis
 * @created 2024-XX-XX
 * @lastModified 2024-XX-XX
 * @description file containing LiveChatContainer component
 */

import { useState } from 'react';
import YouTubeLiveChatOverlay from './YoutubeLiveChatOverlay';
import { FeatureGate } from '../Gates/FeatureGate'; // Перевірте шлях імпорту
import { AVAILABLE_FEATURES } from '../../utils/roleUtils';

/**
 * Shows a live chat container with an embedded iframe for YouTube live chat, and an AI summary panel that can be toggled.
 *
 * @param {Object} props - The component properties
 * @param {string} props.chatSrc - The source URL for the live chat iframe.
 *
 * @returns {JSX.Element} The rendered LiveChatContainer component.
 */
const LiveChatContainer = ({ chatSrc }) => {
  const [showSummary, setShowSummary] = useState(true);

  return (
    <div className="w-full h-[500px] bg-neutral relative text-white overflow-hidden rounded-md">
      
      {/* Summary Panel (Розкоментовано і додано FeatureGate) */}
      <FeatureGate flag={AVAILABLE_FEATURES.AI_SUMMARY}>
        <div
          className={`absolute top-0 left-0 right-0 z-50 bg-neutral/90 backdrop-blur-sm border-b border-gray-700 transition-all duration-500 ease-in-out ${
            showSummary ? "max-h-64 opacity-100 py-4 px-6" : "max-h-0 opacity-0 py-0 px-6"
          } overflow-hidden`}
        >
          <div className="flex justify-between items-start">
            <YouTubeLiveChatOverlay chatSrc={chatSrc} />
            <button
              onClick={() => setShowSummary(false)}
              className="ml-4 text-gray-400 hover:text-white text-2xl font-bold"
              title="Close Summary"
            >
              ×
            </button>
          </div>
        </div>

        {/* Toggle Button (Розкоментовано) */}
        {!showSummary && (
          <div className="absolute top-2 right-4 z-40">
            <button
              onClick={() => setShowSummary(true)}
              className="bg-primary text-black text-xs font-bold px-3 py-1 rounded-full hover:bg-primary/80 shadow-lg"
              title="Show Summary"
            >
              AI Details
            </button>
          </div>
        )}
      </FeatureGate>

      {/* Embedded Chat */}
      {/* Додаємо динамічний клас, щоб чат зсувався вниз, коли відкрите summary */}
      <div
        className={`transition-all duration-500 ease-in-out relative w-full overflow-hidden rounded-t-none rounded-b-lg ${
             showSummary ? "mt-64 h-[calc(100%-16rem)]" : "h-full"
        }`}
      >
        <iframe
          className="w-full h-full border-0"
          src={chatSrc} 
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Live Chat"
        />
      </div>
    </div>
  );
};

export default LiveChatContainer;