/**
 * @file LiveChatContainer.js
 * @author Jonas Matulis
 * @created 2024-XX-XX
 * @lastModified 2024-XX-XX
 * @description file containing LiveChatContainer component
 */

//import { useState } from 'react';
//import YouTubeLiveChatOverlay from './YoutubeLiveChatOverlay';

/**
 * Shows a live chat container with an embedded iframe for YouTube live chat, and an AI summary panel that can be toggled.
 *
 * @param {Object} props - The component properties
 * @param {string} props.chatSrc - The source URL for the live chat iframe.
 *
 * @returns {JSX.Element} The rendered LiveChatContainer component.
 */
const LiveChatContainer = ({ chatSrc }) => {
  //const [showSummary, setShowSummary] = useState(true);

  return (
    <div className="w-full h-[500px] bg-neutral relative text-white overflow-hidden rounded-md">
      {/* Summary Panel
      <div
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
          showSummary ? "max-h-64 opacity-100 py-4 px-6" : "max-h-0 opacity-0 py-0 px-6"
        } overflow-hidden`}
      >
        <div className="flex justify-between items-start">
          <YouTubeLiveChatOverlay chatSrc={chatSrc} />
          <button
            onClick={() => setShowSummary(false)}
            className="ml-4 text-white hover:text-red-400 text-2xl font-bold"
            title="Close Summary"
          >
            ×
          </button>
        </div>
      </div>*/}

      {/*Three Dots Toggle Button
      {!showSummary && (
        <div className="absolute top-2 right-4 z-40">
          <button
            onClick={() => setShowSummary(true)}
            className="text-white text-xl px-2 hover:text-gray-300"
            title="Show Summary"
          >
            AI Details
          </button>
        </div>
      )}*/}

      {/* Embedded Chat */}
      {/*${showSummary ? "mt-64 h-[calc(100%-16rem)]" : "h-full"}*/}

      <div
        className={`transition-all duration-500 ease-in-out relative w-full overflow-hidden rounded-t-none rounded-b-lg h-full`}
      >
        <iframe
          className="w-full h-full border-0"
          src={chatSrc} //url format diff from emebdding youtube video (even though this uses iframe as well)
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
