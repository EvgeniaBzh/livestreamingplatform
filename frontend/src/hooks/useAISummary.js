/**
 * @file useAISummary.js
 * @author Paola Bustos, Yevheniia Bazhmaieva
 * @created 2025-07-14
 * @lastModified 2025-07-29
 * @description Custom React hook for managing AI summaries for archived videos.
 * Handles both pre-generated summaries and real-time generation every 30 seconds.
 */

import { useState, useEffect, useRef, useCallback } from "react";

const useAISummary = (
  allShownMessages, 
  metadata, 
  currentVideoTime = 0, 
  preGeneratedSummaries = [],
  videoId = null,
  summaryFormat = "bullet"
) => {
  // ==================== STATE MANAGEMENT ====================
  const [overlayText, setOverlayText] = useState("");
  const [topics, setTopics] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [paragraphSummary, setParagraphSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ==================== TRACKING REFERENCES ====================
  const lastUpdateVideoTimeRef = useRef(-1);
  const lastGeneratedTimeRef = useRef(-1);

  // ==================== CONSTANTS ====================
  const VIDEO_TIME_UPDATE_INTERVAL = 5; // Reduced from 30 to 5 seconds for testing

  // ==================== DEBUG LOGGING ====================
  useEffect(() => {
    console.log('=== useAISummary Debug ===');
    console.log('currentVideoTime:', currentVideoTime);
    console.log('summaryFormat:', summaryFormat);
    console.log('videoId:', videoId);
    console.log('allShownMessages length:', allShownMessages?.length || 0);
    console.log('preGeneratedSummaries length:', preGeneratedSummaries?.length || 0);
    console.log('lastUpdateVideoTimeRef.current:', lastUpdateVideoTimeRef.current);
    console.log('overlayText:', overlayText ? `${overlayText.substring(0, 50)}...` : 'empty');
    console.log('topics count:', topics?.length || 0);
    console.log('languages count:', languages?.length || 0);
    console.log('=== End useAISummary Debug ===');
  }, [currentVideoTime, summaryFormat, videoId, allShownMessages, preGeneratedSummaries, overlayText, topics, languages]);

  // ==================== UTILITY FUNCTIONS ====================
  const parseLabelEmojiPairs = (input) => {
    if (!input || typeof input !== 'string') return [];

    const regex =
      /"([^"]+)"\s+([\p{Emoji_Presentation}\p{Extended_Pictographic}]{1,2})/gu;
    const matches = [...input.matchAll(regex)];

    return matches.map((match) => ({
      label: match[1],
      emoji: match[2],
    }));
  };

  // ==================== AI SUMMARY GENERATION ====================
  const generateAISummary = useCallback(async (messagesForAnalysis, timeSegment) => {
    console.log('=== generateAISummary called ===');
    console.log('messagesForAnalysis length:', messagesForAnalysis?.length || 0);
    console.log('timeSegment:', timeSegment);
    console.log('videoId:', videoId);
    console.log('summaryFormat:', summaryFormat);

    if (!videoId || !messagesForAnalysis || messagesForAnalysis.length === 0) {
      console.log("No messages or videoId for AI summary generation");
      return null;
    }

    setIsLoading(true);
    console.log('Starting AI summary generation...');

    try {
      const requestBody = {
        videoId,
        messages: messagesForAnalysis,
        timeSegment: {
          start: timeSegment.start,
          end: timeSegment.end
        },
        format: summaryFormat
      };

      console.log('API request body:', requestBody);

      const response = await fetch("http://localhost:8080/api/generateArchiveSummary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("Generated AI summary response:", data);

      const result = {
        summary: data.summary || "",
        topics: data.topics || "",
        languages: data.languages || "",
        paragraphSummary: data.paragraphSummary || data.summary || ""
      };

      console.log('Processed AI summary result:', result);
      return result;

    } catch (error) {
      console.error("Error generating AI summary:", error);
      return {
        summary: "Error: Could not generate summary.",
        topics: "",
        languages: "",
        paragraphSummary: "Error: Could not generate summary."
      };
    } finally {
      setIsLoading(false);
      console.log('=== End generateAISummary ===');
    }
  }, [videoId, summaryFormat]);

  // ==================== MESSAGE FILTERING FOR TIME SEGMENT ====================
  const getMessagesForTimeSegment = useCallback((startTime, endTime) => {
    console.log(`=== getMessagesForTimeSegment: ${startTime}s to ${endTime}s ===`);
    console.log('allShownMessages length:', allShownMessages?.length || 0);

    if (!allShownMessages || allShownMessages.length === 0) {
      console.log('No messages available');
      return [];
    }

    const filteredMessages = allShownMessages.filter(message => {
      const messageTime = message.time_in_seconds || 0;
      const inRange = messageTime >= startTime && messageTime <= endTime;
      if (inRange) {
        console.log(`Message at ${messageTime}s: "${message.message?.substring(0, 50)}..."`);
      }
      return inRange;
    });

    console.log(`Filtered ${filteredMessages.length} messages for time segment`);
    return filteredMessages;
  }, [allShownMessages]);

  // ==================== PRE-GENERATED SUMMARY SELECTION ====================
  const selectPreGeneratedSummary = useCallback((videoTime) => {
    console.log('=== selectPreGeneratedSummary ===');
    console.log('videoTime:', videoTime);
    console.log('preGeneratedSummaries length:', preGeneratedSummaries?.length || 0);

    if (!preGeneratedSummaries || preGeneratedSummaries.length === 0) {
      console.log('No pre-generated summaries available');
      return null;
    }

    const appropriateSummary = preGeneratedSummaries.find(summary => {
      const summaryStartTime = summary.startTime || 0;
      const summaryEndTime = summary.endTime || Infinity;
      const matches = videoTime >= summaryStartTime && videoTime < summaryEndTime;
      console.log(`Checking summary: ${summaryStartTime}-${summaryEndTime}, matches: ${matches}`);
      return matches;
    });

    console.log('Selected pre-generated summary:', appropriateSummary ? 'found' : 'none');
    return appropriateSummary;
  }, [preGeneratedSummaries]);

  // ==================== MAIN SUMMARY UPDATE FUNCTION ====================
  const updateSummaryForCurrentTime = useCallback(async (reason = "interval") => {
    const currentTime = Math.floor(currentVideoTime);
    
    console.log('=== updateSummaryForCurrentTime called ===');
    console.log('reason:', reason);
    console.log('currentTime:', currentTime);
    console.log('lastUpdateVideoTimeRef.current:', lastUpdateVideoTimeRef.current);
    
    // Don't update if we've already processed this time (unless it's a format change)
    if (currentTime === lastUpdateVideoTimeRef.current && reason !== "format-change") {
      console.log('Already processed this time, skipping');
      return;
    }

    console.log(`Summary update (${reason}) at video time: ${currentTime}s`);

    // First, try to find pre-generated summary
    const preGeneratedSummary = selectPreGeneratedSummary(currentTime);
    
    if (preGeneratedSummary) {
      console.log("Using pre-generated summary for time:", currentTime);
      console.log("Pre-generated summary content:", {
        summary: preGeneratedSummary.summary?.substring(0, 100) + '...',
        topics: preGeneratedSummary.topics?.substring(0, 50) + '...',
        languages: preGeneratedSummary.languages?.substring(0, 50) + '...'
      });
      
      setOverlayText(preGeneratedSummary.summary || "");
      setParagraphSummary(preGeneratedSummary.paragraphSummary || preGeneratedSummary.summary || "");
      setTopics(parseLabelEmojiPairs(preGeneratedSummary.topics || ""));
      setLanguages(parseLabelEmojiPairs(preGeneratedSummary.languages || ""));
      
      lastUpdateVideoTimeRef.current = currentTime;
      console.log('Pre-generated summary applied successfully');
      return;
    }

    console.log('No pre-generated summary found, checking for live generation...');

    // If no pre-generated summary and summaryFormat is not "none", generate new one
    if (summaryFormat !== "none" && videoId) {
      console.log('Attempting to generate new AI summary');
      
      // For early video times, use a smaller window
      const windowSize = currentTime < 30 ? Math.max(5, currentTime) : 30;
      const segmentStart = Math.max(0, currentTime - windowSize);
      const segmentEnd = currentTime;
      
      console.log(`Time segment: ${segmentStart}s to ${segmentEnd}s (window size: ${windowSize}s)`);
      
      // Get messages for this time segment
      const messagesForAnalysis = getMessagesForTimeSegment(segmentStart, segmentEnd);
      
      console.log('Messages for analysis:', messagesForAnalysis.length);
      
      if (messagesForAnalysis.length > 0) {
        console.log(`Generating AI summary for ${messagesForAnalysis.length} messages from ${segmentStart}s to ${segmentEnd}s`);
        
        const generatedSummary = await generateAISummary(messagesForAnalysis, {
          start: segmentStart,
          end: segmentEnd
        });
        
        console.log('Generated summary result:', generatedSummary);
        
        if (generatedSummary) {
          console.log('Applying generated summary...');
          setOverlayText(generatedSummary.summary);
          setParagraphSummary(generatedSummary.paragraphSummary);
          setTopics(parseLabelEmojiPairs(generatedSummary.topics));
          setLanguages(parseLabelEmojiPairs(generatedSummary.languages));
          console.log('Generated summary applied successfully');
        } else {
          console.log('Generated summary was null');
        }
      } else {
        console.log("No messages found for time segment", segmentStart, "to", segmentEnd);
        setOverlayText("No chat activity in this time segment");
        setParagraphSummary("No chat activity in this time segment");
        setTopics([]);
        setLanguages([]);
      }
    } else {
      console.log('Conditions not met for AI summary generation');
      console.log('summaryFormat:', summaryFormat);
      console.log('videoId:', videoId);
      
      if (summaryFormat === "none") {
        console.log('Clearing summaries due to "none" format');
        setOverlayText("");
        setParagraphSummary("");
        setTopics([]);
        setLanguages([]);
      }
    }

    lastUpdateVideoTimeRef.current = currentTime;
    console.log('=== End updateSummaryForCurrentTime ===');
  }, [
    currentVideoTime,
    selectPreGeneratedSummary,
    summaryFormat,
    videoId,
    getMessagesForTimeSegment,
    generateAISummary
  ]);

  // ==================== VIDEO TIME MONITORING LOGIC ====================
  useEffect(() => {
    console.log('=== Main Summary Effect ===');
    console.log('summaryFormat:', summaryFormat);
    console.log('currentVideoTime:', currentVideoTime);
    
    if (summaryFormat === "none") {
      console.log('Summary format is "none", clearing summaries');
      setOverlayText("");
      setParagraphSummary("");
      setTopics([]);
      setLanguages([]);
      return;
    }

    const currentTime = Math.floor(currentVideoTime);
    console.log('currentTime (floored):', currentTime);
    console.log('lastUpdateVideoTimeRef.current:', lastUpdateVideoTimeRef.current);
    
    // Initial update when video starts or is very early
    if (currentTime <= 3 && lastUpdateVideoTimeRef.current === -1) {
      console.log("Triggering initial summary selection for archived video");
      updateSummaryForCurrentTime("initial-load");
      return;
    }

    // Check if enough time has passed since the last update
    const timeSinceLastUpdate = currentTime - lastUpdateVideoTimeRef.current;
    console.log('timeSinceLastUpdate:', timeSinceLastUpdate);

    if (timeSinceLastUpdate >= VIDEO_TIME_UPDATE_INTERVAL) {
      console.log(`${VIDEO_TIME_UPDATE_INTERVAL} seconds passed - updating summary. Time diff: ${timeSinceLastUpdate}s`);
      updateSummaryForCurrentTime(`${VIDEO_TIME_UPDATE_INTERVAL}s-video-time`);
    } else if (lastUpdateVideoTimeRef.current === -1) {
      console.log('No previous update, triggering first update');
      updateSummaryForCurrentTime("first-update");
    } else {
      console.log(`Not enough time passed yet. Need ${VIDEO_TIME_UPDATE_INTERVAL - timeSinceLastUpdate} more seconds`);
    }
    
    console.log('=== End Main Summary Effect ===');
  }, [currentVideoTime, summaryFormat, updateSummaryForCurrentTime]);

  // ==================== RESET ON VIDEO CHANGE ====================
  useEffect(() => {
    if (metadata?.title || videoId) {
      console.log(`=== Video changed to: ${metadata?.title || videoId} ===`);
      lastUpdateVideoTimeRef.current = -1;
      lastGeneratedTimeRef.current = -1;
      
      // Reset summaries for new video
      setOverlayText("");
      setParagraphSummary("");
      setTopics([]);
      setLanguages([]);
      console.log('Video change - summaries reset');
    }
  }, [metadata?.title, videoId]);

  // ==================== SUMMARY FORMAT CHANGE ====================
  useEffect(() => {
    // When summary format changes, update immediately if we're not at "none"
    if (summaryFormat !== "none" && currentVideoTime > 0) {
      console.log("=== Summary format changed to:", summaryFormat, "===");
      // Force a new summary generation regardless of time
      updateSummaryForCurrentTime("format-change");
    }
  }, [summaryFormat, updateSummaryForCurrentTime]);

  // ==================== MESSAGES CHANGE EFFECT ====================
  useEffect(() => {
    // When messages are loaded and we have a video, trigger initial summary
    if (allShownMessages && allShownMessages.length > 0 && videoId && summaryFormat !== "none") {
      console.log(`=== Messages loaded: ${allShownMessages.length} messages ===`);
      if (lastUpdateVideoTimeRef.current === -1) {
        console.log('Messages loaded, triggering initial summary');
        updateSummaryForCurrentTime("messages-loaded");
      }
    }
  }, [allShownMessages, videoId, summaryFormat, updateSummaryForCurrentTime]);

  // ==================== HOOK RETURN ====================
  return {
    overlayText,
    topics,
    languages,
    paragraphSummary,
    isLoading,
    updateSummaryForCurrentTime, // Expose for manual control if needed
  };
};

export default useAISummary;