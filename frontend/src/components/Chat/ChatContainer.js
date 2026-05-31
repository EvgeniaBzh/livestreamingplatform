/**
 * @file ChatContainer.js
 * @author Paola Bustos, Yevheniia Bazhmaieva
 * @created 2025-07-14
 * @lastModified 2025-07-29
 * @description Chat container component that displays video chat messages with AI summary overlay.
 *              Handles message rendering, emoji processing, and AI summary display functionality.
 */

import React, { useRef, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const ChatContainer = ({
  displayedMessages,
  currentTime,
  showSummary,
  setShowSummary,
  summaryFormat,
  overlayText,
  topics,
  languages,
  paragraphSummary,
  updateOverlayText, // Add this prop for manual testing
}) => {
  // ==================== REFS & STATE ====================
  const chatContainerRef = useRef(null);

  // ==================== UTILITY FUNCTIONS ====================
  const processMessageEmojis = (message, emotes) => {
    if (!message) return "";
    if (!emotes || !Array.isArray(emotes)) return message;

    let processedMessage = message;
    emotes.forEach((emote) => {
      if (emote && emote.shortcuts && Array.isArray(emote.shortcuts)) {
        emote.shortcuts.forEach((shortcut) => {
          if (shortcut && typeof shortcut === "string") {
            const regex = new RegExp(
              shortcut.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              "g",
            );
            if (emote.images && emote.images.length > 0) {
              processedMessage = processedMessage.replace(
                regex,
                `<img src="${emote.images[0].url}" alt="${emote.name}" class="inline w-4 h-4 align-middle mx-1" />`,
              );
            }
          }
        });
      }
    });
    return processedMessage;
  };

  // ==================== AI OVERLAY COMPONENT ====================
  const AIOverlay = () => {
    if (summaryFormat === "none") {
      return null;
    }

    // Create stable keys for rendering
    const timestamp = Date.now();

    return (
      <div className="w-full h-full max-h-[700px] scrollable-y space-y-4 text-white pt-0 pl-2 pr-2 pb-24">
        {summaryFormat === "paragraph" ? (
          <div>
            <h3 className="text-md font-semibold mb-2">
              Paragraph Summary:
            </h3>
            <p className="text-sm text-gray-300">
              {paragraphSummary || overlayText || "Loading paragraph summary..."}
            </p>
          </div>
        ) : summaryFormat === "bullet" ? (
          <div>
            <h3 className="text-md font-semibold mb-2">
              Live Summary:
            </h3>
            <div className="flex gap-8 mt-4 overflow-auto">
              {/* Topics Section */}
              <div className="flex-[2] overflow-auto pr-0">
                <h4 className="text-sm font-semibold mb-2">Topics:</h4>
                {topics && topics.length > 0 ? (
                  <div className="space-y-2">
                    {topics.map((topic, index) => (
                      <div key={`topic-${index}-${topic.label}`} className="flex items-center gap-2">
                        <span className="text-lg">{topic.emoji}</span>
                        <span className="text-sm text-gray-300">
                          {topic.label}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Loading topics...</p>
                )}
              </div>

              {/* Languages Section */}
              <div className="flex-1 max-h-[500px] overflow-y-scroll pr-4">
                <h4 className="text-sm font-semibold mb-2">Languages:</h4>
                {languages && languages.length > 0 ? (
                  <div className="space-y-2">
                    {languages.map((language, index) => (
                      <div key={`lang-${index}-${language.label}`} className="flex items-center gap-2">
                        <span className="text-lg">{language.emoji}</span>
                        <span className="text-sm text-gray-300">
                          {language.label}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Loading languages...</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400">
              Unknown summary format: {summaryFormat}
            </p>
          </div>
        )}
      </div>
    );
  };

  // ==================== CONSTANTS ====================
  const shouldShowAIButton = summaryFormat !== "none";

  // ==================== MAIN RENDER ====================
  return (
    <div className="switchable-chat-container">
      <div className="desktop:w-[25vw] desktop:h-[85vh] xl:w-[400px] xl:h-[600px] lg:w-[350px] lg:h-[500px] md:w-[300px] md:h-[450px] w-[280px] h-[400px]">
        <div className="chat-content flex-grow mt-6 h-[90%] md:h-[80%]">
          <div className="w-full h-[500px] bg-neutral relative text-white overflow-hidden rounded-md">
            {/* AI Summary Overlay Panel */}
            {shouldShowAIButton && (
              <div
                className={`absolute top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
                  showSummary
                    ? "max-h-64 opacity-100 py-4 px-6"
                    : "max-h-0 opacity-0 py-0 px-6"
                } overflow-hidden`}
              >
                <div className="flex justify-between items-start">
                  <AIOverlay />
                  <button
  onClick={() => setShowSummary(true)}
  className="btn btn-sm btn-primary rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2"
  title="Show AI Summary"
>
  <Sparkles className="w-4 h-4" />
  <span className="hidden md:inline">AI Details</span>
</button>
                </div>
              </div>
            )}

            {/* Show Summary Button */}
            {!showSummary && shouldShowAIButton && (
              <div className="absolute top-2 right-4 z-40 flex gap-2">
                {/* Manual test button for debugging */}
                {updateOverlayText && (
                  <button
                    onClick={() => updateOverlayText("manual-test")}
                    className="text-white text-sm px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded"
                    title="Test AI Update"
                  >
                    Test AI
                  </button>
                )}
                <button
                  onClick={() => setShowSummary(true)}
                  className="text-white text-xl px-2 hover:text-gray-300"
                  title="Show Summary"
                >
                  AI Details
                </button>
              </div>
            )}

            {/* Chat Messages Container */}
            <div
              className={`transition-all duration-500 ease-in-out relative w-full overflow-hidden rounded-t-none rounded-b-lg ${
                showSummary && shouldShowAIButton
                  ? "mt-64 h-[calc(100%-16rem)]"
                  : "h-full"
              }`}
            >
              <div className="h-full bg-white text-black">
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      Video Chat
                    </h3>
                    
                  </div>
                </div>

                <div
                  ref={chatContainerRef}
                  className="h-[calc(100%-50px)] overflow-y-scroll p-3 space-y-2"
                >
                  {displayedMessages &&
                    displayedMessages.map((message, index) => (
                      <div
                        key={message.message_id || index}
                        className="flex items-start gap-2"
                      >
                        {message.author?.images &&
                          message.author.images.length > 0 && (
                            <img
                              src={
                                message.author.images.find(
                                  (img) => img.id === "32x32",
                                )?.url || message.author.images[0]?.url
                              }
                              alt={message.author?.name || "User avatar"}
                              className="w-6 h-6 rounded-full flex-shrink-0"
                            />
                          )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-sm text-gray-900">
                              {message.author?.name || "User"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {message.time_text}
                            </span>
                          </div>

                          <div
                            className="text-sm text-gray-900 break-words"
                            dangerouslySetInnerHTML={{
                              __html: processMessageEmojis(
                                message.message,
                                message.emotes,
                              ),
                            }}
                          />
                        </div>
                      </div>
                    ))}

                  {(!displayedMessages || displayedMessages.length === 0) && (
                    <div className="text-center text-gray-500 text-sm mt-8">
                      Chat will appear here during playback
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;