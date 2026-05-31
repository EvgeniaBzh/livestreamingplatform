import { useState, useRef, useCallback, useEffect } from 'react';

const EMOTION_THRESHOLD = 0.65;
const CHAT_WINDOW = 30;
const SCORE_INTERVAL = 3000;
const VIDEO_COOLDOWN = 30000;
const NLP_BASE = 'http://localhost:5001';
const VISION_BASE = 'http://localhost:5002';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function useSmartAnalysis(videoId, allMessages, currentTime, isEnabled) {
  const [smartLog, setSmartLog] = useState([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentKeywords, setCurrentKeywords] = useState([]);
  const [isScoring, setIsScoring] = useState(false);
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [lastInsight, setLastInsight] = useState(null);
  const [totalTriggered, setTotalTriggered] = useState(0);

  // ── Summary states ────────────────────────────────────────────────────────
  const [streamSummary, setStreamSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const allMessagesRef = useRef(allMessages);
  const currentTimeRef = useRef(currentTime);
  const isEnabledRef = useRef(isEnabled);
  const videoIdRef = useRef(videoId);
  const lastVideoAnalysisTime = useRef(-VIDEO_COOLDOWN);
  const scoreIntervalRef = useRef(null);
  const isScoringRef = useRef(false);
  const smartLogRef = useRef(smartLog);

  useEffect(() => { allMessagesRef.current = allMessages; }, [allMessages]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { isEnabledRef.current = isEnabled; }, [isEnabled]);
  useEffect(() => { videoIdRef.current = videoId; }, [videoId]);
  useEffect(() => { smartLogRef.current = smartLog; }, [smartLog]);

  // ── triggerVideoAnalysis ──────────────────────────────────────────────────
  const triggerVideoAnalysis = useCallback(async (videoTimestamp, chatMessages, logId) => {
    const vid = videoIdRef.current;
    if (!vid) return;

    setIsAnalyzingVideo(true);
    try {
      const visionRes = await fetch(`${VISION_BASE}/analyze_frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: vid, timestamp: videoTimestamp, duration: 10 }),
      });

      let visionData = null;
      if (visionRes.ok) visionData = await visionRes.json();

      const chatSnippet = chatMessages
        .slice(-20)
        .map(m => `${m.author || 'User'}: ${m.message || m.text || ''}`)
        .join('\n');

      const combinedRes = await fetch(`${NLP_BASE}/generateMomentInsight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTimestamp,
          videoAction: visionData?.full_description || visionData?.label || 'Unknown',
          videoSpeech: visionData?.speech_content || '',
          chatMessages: chatSnippet,
        }),
      });

      let insight = null;
      if (combinedRes.ok) {
        const insightData = await combinedRes.json();
        insight = insightData.insight || insightData;
      } else {
        insight = visionData
          ? `[${formatTime(videoTimestamp)}] ${visionData.full_description || visionData.label}`
          : `[${formatTime(videoTimestamp)}] Chat triggered analysis but video data unavailable.`;
      }

      setLastInsight({ videoTimestamp, insight, chatSnippet });
      setSmartLog(prev => prev.map(e => e.id === logId ? { ...e, status: 'done', insight } : e));
    } catch (err) {
      console.error('[Smart] triggerVideoAnalysis error:', err);
      setSmartLog(prev => prev.map(e => e.id === logId ? { ...e, status: 'error', insight: 'Analysis failed.' } : e));
    } finally {
      setIsAnalyzingVideo(false);
    }
  }, []);

  // ── scoreChatWindow ───────────────────────────────────────────────────────
  const scoreChatWindow = useCallback(async () => {
    if (!isEnabledRef.current) return;
    if (isScoringRef.current) return;

    const msgs = allMessagesRef.current;
    const time = currentTimeRef.current;

    if (!msgs || msgs.length === 0) return;

    const visible = msgs
      .filter(m => m.timestamp !== null && m.timestamp <= time)
      .slice(-CHAT_WINDOW);

    if (visible.length < 3) return;

    isScoringRef.current = true;
    setIsScoring(true);

    try {
      const res = await fetch(`${NLP_BASE}/scoreChatEmotion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_messages: visible.map(m => ({
            author: m.author || 'User',
            message: m.message || m.text || '',
          })),
        }),
      });

      if (!res.ok) return;

      const data = await res.json();
      const score = typeof data.score === 'number' ? data.score : 0;
      const keywords = data.keywords ?? [];
      const reason = data.reason ?? '';

      setCurrentScore(score);
      setCurrentKeywords(keywords);

      const now = Date.now();
      const cooldownOk = (now - lastVideoAnalysisTime.current) >= VIDEO_COOLDOWN;

      if (score >= EMOTION_THRESHOLD && cooldownOk) {
        lastVideoAnalysisTime.current = now;
        setTotalTriggered(p => p + 1);

        const logEntry = {
          id: now,
          videoTime: time,
          score,
          keywords,
          reason,
          status: 'analyzing',
          insight: null,
        };
        setSmartLog(prev => [logEntry, ...prev].slice(0, 50));
        triggerVideoAnalysis(time, visible, logEntry.id);
      } else {
        setSmartLog(prev => [{
          id: now,
          videoTime: time,
          score,
          keywords,
          reason,
          status: 'scored',
          insight: null,
        }, ...prev].slice(0, 50));
      }
    } catch (err) {
      console.error('[Smart] scoreChatEmotion error:', err);
    } finally {
      isScoringRef.current = false;
      setIsScoring(false);
    }
  }, [triggerVideoAnalysis]);

  // ── Polling loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(scoreIntervalRef.current);
    if (!isEnabled) return;

    scoreChatWindow();
    scoreIntervalRef.current = setInterval(scoreChatWindow, SCORE_INTERVAL);

    return () => clearInterval(scoreIntervalRef.current);
  }, [isEnabled, scoreChatWindow]);

  // ── Download JSON report ──────────────────────────────────────────────────
  const downloadSmartReport = useCallback(() => {
    const log = smartLogRef.current;
    const report = {
      videoId: videoIdRef.current,
      generatedAt: new Date().toISOString(),
      analysisMode: 'SMART_CHAT_TRIGGERED',
      totalScoringEvents: log.length,
      totalVideoTriggers: totalTriggered,
      threshold: EMOTION_THRESHOLD,
      events: log.map(e => ({
        videoTime: e.videoTime,
        emotionScore: e.score,
        triggered: e.status === 'done' || e.status === 'analyzing',
        keywords: e.keywords,
        reason: e.reason,
        insight: e.insight,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_report_${videoIdRef.current}_${Date.now()}.json`;
    a.click();
  }, [totalTriggered]);

  // ── Generate stream summary (аналог baseline /generate_summary) ───────────
  const generateSmartSummary = useCallback(async () => {
    const log = smartLogRef.current;
    const vid = videoIdRef.current;

    // Беремо тільки події де є insight (тобто відео було проаналізовано)
    const triggeredEvents = log.filter(e => e.status === 'done' && e.insight);

    if (triggeredEvents.length === 0) {
      alert('No analyzed moments yet. Wait for Smart Mode to trigger video analysis (score ≥ 65%).');
      return;
    }

    setIsGeneratingSummary(true);
    setStreamSummary(null);

    try {
      // Формуємо data у форматі який очікує /generate_summary на порту 5002
      const data = triggeredEvents.map(e => ({
        time: e.videoTime,
        action: e.insight,          // insight вже містить опис моменту
        speech: '',
        label: e.keywords?.join(', ') || '',
        confidence: e.score,
      }));

      const response = await fetch(`${VISION_BASE}/generate_summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: vid, data }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const result = await response.json();
      setStreamSummary(result.summary || 'No summary returned.');
    } catch (err) {
      console.error('[Smart] generateSmartSummary error:', err);
      setStreamSummary('Failed to generate summary. Check that the Vision server (5002) is running.');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, []);

  // ── Download summary as .txt ──────────────────────────────────────────────
  const downloadSummaryTxt = useCallback(() => {
    if (!streamSummary) return;
    const blob = new Blob([streamSummary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_summary_${videoIdRef.current}_${Date.now()}.txt`;
    a.click();
  }, [streamSummary]);

  return {
    smartLog,
    currentScore,
    currentKeywords,
    isScoring,
    isAnalyzingVideo,
    lastInsight,
    totalTriggered,
    downloadSmartReport,
    // нові:
    streamSummary,
    isGeneratingSummary,
    generateSmartSummary,
    downloadSummaryTxt,
  };
}