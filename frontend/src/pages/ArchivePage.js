import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ArchiveChatContainer from '../components/ArchiveLive/ArchiveChatContainer';

console.log('ArchivePage module loaded');

const BASELINE_URL         = 'http://localhost:5002';
const SMART_URL            = 'http://localhost:5001';
const NLP_URL              = 'http://localhost:5001';
const BASELINE_INTERVAL    = 4000;
const SMART_INTERVAL       = 4000;  // NLP перевіряємо часто — це дешево
const SMART_CHAT_WINDOW    = 40;
const SMART_THRESHOLD      = 0.7;
const SMART_FRAME_COOLDOWN = 15;    // секунд між викликами CV

// ─── Рівень 0: Локальний фільтр (безкоштовно, без API) ───────────────────────
const getLocalActivityScore = (messages, currentTime) => {
  const recent = messages.filter(
    (m) => m.timestamp <= currentTime && m.timestamp >= currentTime - 10
  );
  if (recent.length === 0) return 0;

  let score = 0;
  score += Math.min(recent.length / 15, 0.4);
  const capsCount = recent.filter((m) =>
    (m.message || m.text || '').match(/[A-Z]{3,}/)
  ).length;
  score += Math.min(capsCount / 8, 0.3);
  const exclCount = recent.filter((m) =>
    (m.message || m.text || '').includes('!')
  ).length;
  score += Math.min(exclCount / 8, 0.3);

  return Math.min(score, 1.0);
};

const extractVideoId = (url) => {
  if (!url) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('?')[0] || null;
    const v = parsed.searchParams.get('v');
    if (v) return v;
    const m = parsed.pathname.match(/\/(?:live|embed)\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  } catch { return null; }
  return null;
};

// ── ВИМКНЕНО: parseGeminiString використовувалась для AI Summary ──────────────
// const parseGeminiString = (str) => {
//   if (!str || typeof str !== 'string') return [];
//   return str.split(',').map((item) => {
//     const m = item.match(/"([^"]+)"\s*(.+)/);
//     return m ? { label: m[1], emoji: m[2].trim() } : null;
//   }).filter(Boolean);
// };

const fmtTime = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const ArchivePage = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [videoId,  setVideoId]  = useState(null);
  const [error,    setError]    = useState('');

  const [messages,    setMessages]    = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);

  const baselineHistoryRef = useRef([]);
const smartHighlightsRef = useRef([]);

  // ── ВИМКНЕНО: стани для AI Summary (topics, languages, paragraphSummary) ────
  // const [topics,           setTopics]           = useState([]);
  // const [languages,        setLanguages]        = useState([]);
  // const [paragraphSummary, setParagraphSummary] = useState('');
  // const [isGenerating,     setIsGenerating]     = useState(false);

  const [analysisMode, setAnalysisMode] = useState('smart');

  const [baselineDetection,   setBaselineDetection]   = useState(null);
  const [baselineHistory,     setBaselineHistory]     = useState([]);
  const [isAnalyzingBaseline, setIsAnalyzingBaseline] = useState(false);

  const [smartScore,      setSmartScore]      = useState(null);
  const [localScore,      setLocalScore]      = useState(0);
  const [smartHighlights, setSmartHighlights] = useState([]);
  const [lastSmartResult, setLastSmartResult] = useState(null);
  const [isAnalyzingSmart, setIsAnalyzingSmart] = useState(false);

  const [streamSummary,       setStreamSummary]       = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const playerRef              = useRef(null);
  const iframeRef              = useRef(null);
  const workerRef              = useRef(null);
  const isAnalyzingRef         = useRef(false);
  const analysisModeRef        = useRef(analysisMode);
  const messagesRef            = useRef(messages);
  const videoIdRef             = useRef(videoId);
  const lastFrameAnalyzedAtRef = useRef(0);

  useEffect(() => { analysisModeRef.current = analysisMode; }, [analysisMode]);
  useEffect(() => { messagesRef.current     = messages;     }, [messages]);
  useEffect(() => { videoIdRef.current      = videoId;      }, [videoId]);

  useEffect(() => { baselineHistoryRef.current = baselineHistory; }, [baselineHistory]);
useEffect(() => { smartHighlightsRef.current = smartHighlights; }, [smartHighlights]);

  const activeRequestsRef    = useRef(0);
  const MAX_PARALLEL_QUERIES = 2;

  // ── ВИМКНЕНО: fetchAISummary — викликала /generateTopics, /generateLanguages,
  // /generateParagraphSummary і записувала результати у topics, languages,
  // paragraphSummary. Вимкнено бо ці ендпоінти тимчасово недоступні і повертають
  // об'єкт {message: "disabled"} замість рядка, що ламало рендер. ──────────────
  // const fetchAISummary = useCallback(async (chatMessages) => {
  //   if (!chatMessages?.length) return;
  //   setIsGenerating(true);
  //   const payload = { chat_messages: chatMessages, videoTitle: 'Archive Video', videoDescription: '' };
  //   try {
  //     const [tRes, lRes, sRes] = await Promise.all([
  //       fetch(`${NLP_URL}/generateTopics`,          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  //       fetch(`${NLP_URL}/generateLanguages`,        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  //       fetch(`${NLP_URL}/generateParagraphSummary`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  //     ]);
  //     setTopics(parseGeminiString(await tRes.json()));
  //     setLanguages(parseGeminiString(await lRes.json()));
  //     setParagraphSummary(await sRes.json());
  //   } catch (err) { console.error('NLP error:', err); }
  //   finally { setIsGenerating(false); }
  // }, []);

  useEffect(() => {
    if (!videoId) return;
    const loadChat = async () => {
      setChatLoading(true);
      setBaselineHistory([]);
      setBaselineDetection(null);
      setSmartHighlights([]);
      setSmartScore(null);
      setLastSmartResult(null);
      setStreamSummary(null);
      setLocalScore(0);
      isAnalyzingRef.current = false;
      lastFrameAnalyzedAtRef.current = 0;

      try {
        const snap = await getDocs(collection(db, 'videos', videoId, 'chatChunks'));
        const msgs = snap.docs
          .flatMap((d) => {
            const data = d.data();
            return (data.messages || []).map((m) => ({
              ...m,
              chunkId: d.id,
              text: m.message ?? m.text ?? '',
            }));
          })
          .filter((m) => m.timestamp !== null && m.timestamp !== undefined)
          .sort((a, b) => a.timestamp - b.timestamp);

        setMessages(msgs);
        // if (msgs.length > 0) fetchAISummary(msgs);  // ВИМКНЕНО
      } catch (err) {
        console.error('Chat load error:', err);
        setMessages([]);
      } finally { setChatLoading(false); }
    };
    loadChat();
    setCurrentTime(0);
  }, [videoId]);  // fetchAISummary прибрано з залежностей бо вимкнена

  const runAnalysisTick = useCallback(async (workerTime) => {
    setCurrentTime(workerTime);
    if (!videoIdRef.current) return;

    const mode = analysisModeRef.current;
    const vId  = videoIdRef.current;
    const time = Math.round(workerTime);

    if (mode === 'baseline') {
      if (activeRequestsRef.current >= MAX_PARALLEL_QUERIES) {
        console.warn(`[Baseline] Skip tick ${time}s: Server busy (${activeRequestsRef.current} active)`);
        return;
      }
    } else if (mode === 'smart') {
      if (isAnalyzingRef.current) return;
    }

    isAnalyzingRef.current = true;
    activeRequestsRef.current += 1;

    try {
      if (mode === 'baseline') {
        setIsAnalyzingBaseline(true);

        const res = await fetch(`${BASELINE_URL}/analyze_frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: vId, timestamp: time, mode: 'baseline' }),
          keepalive: true,
        });

        if (res.ok) {
          const data = await res.json();
          setBaselineDetection(data);
          setBaselineHistory((prev) => {
            if (prev.some(i => i.time === data.timestamp)) return prev;
            return [...prev, {
              time:   data.timestamp,
              action: data.full_description,
              speech: data.speech_content,
              label:  data.label,
              logTime: new Date().toLocaleTimeString(),
            }].sort((a, b) => a.time - b.time);
          });
        }

      } else if (mode === 'smart') {
        setIsAnalyzingSmart(true);

        // Рівень 0: Локальний фільтр
        const localActivity = getLocalActivityScore(messagesRef.current, time);
        setLocalScore(localActivity);
        if (localActivity < 0.8) return;

        // Перевірка кулдауну
        if ((time - lastFrameAnalyzedAtRef.current) < SMART_FRAME_COOLDOWN) return;

        // Рівень 1: Gemini NLP
        const windowMsgs = messagesRef.current
          .filter((m) => m.timestamp <= time && m.timestamp >= time - 60)
          .slice(-SMART_CHAT_WINDOW);

        const scoreRes = await fetch(`${SMART_URL}/scoreChatEmotion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_messages: windowMsgs }),
          keepalive: true,
        });
        if (!scoreRes.ok) throw new Error('NLP Score failed');

        const scoreData = await scoreRes.json();
        const score     = scoreData.score ?? 0;

        // Логування scores для аналізу порогів
        fetch(`${NLP_URL}/log_scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp:   time,
            video_id:    vId,
            local_score: localActivity,
            nlp_score:   score,
            is_highlight: score >= SMART_THRESHOLD,
          }),
        });

        setSmartScore(score);
        setLastSmartResult({ score, reason: scoreData.reason });

        // Рівень 2: Gemini CV
        if (score >= SMART_THRESHOLD) {
          lastFrameAnalyzedAtRef.current = time;

          const frameRes = await fetch(`${BASELINE_URL}/analyze_frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: vId, timestamp: time, mode: 'smart' }),
            keepalive: true,
          });

          if (frameRes.ok) {
            const frameData   = await frameRes.json();
            const chatExcerpt = windowMsgs
              .map((m) => `${m.author?.name ?? m.author ?? '?'}: ${m.message ?? m.text ?? ''}`)
              .join('\n');

            const insightRes = await fetch(`${SMART_URL}/generateMomentInsight`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                videoTimestamp: time,
                videoAction:    frameData.full_description ?? '',
                videoSpeech:    frameData.speech_content   ?? '',
                chatMessages:   chatExcerpt,
                videoId:        vId,
              }),
              keepalive: true,
            });

            if (insightRes.ok) {
              const insightData = await insightRes.json();
              setSmartHighlights((prev) => [...prev, {
                timestamp:     time,
                score,
                insight:       insightData.insight       ?? '',
                video_summary: frameData.full_description ?? '',
                video_speech:  frameData.speech_content   ?? '',
              }]);
            }
          }
        }
      }
    } catch (e) {
      console.error('Analysis tick error:', e);
    } finally {
      activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
      isAnalyzingRef.current    = false;
      setIsAnalyzingBaseline(false);
      setIsAnalyzingSmart(false);
    }
  }, []);

  useEffect(() => {
    if (!videoId) return;
    const workerPath = process.env.PUBLIC_URL
      ? `${process.env.PUBLIC_URL}/analysisWorker.js`
      : '/analysisWorker.js';
    const worker = new Worker(workerPath);
    workerRef.current = worker;
    worker.onmessage = ({ data }) => {
      if (data.type === 'TICK') runAnalysisTick(data.currentTime);
    };

    const interval = analysisModeRef.current === 'baseline' ? BASELINE_INTERVAL : SMART_INTERVAL;
    worker.postMessage({ type: 'START', interval, startTime: 0 });
    worker.postMessage({ type: 'PAUSE' });

    const initPlayer = () => {
      if (playerRef.current) playerRef.current.destroy();
      playerRef.current = new window.YT.Player(iframeRef.current, {
        videoId,
        playerVars: { enablejsapi: 1, controls: 1 },
        events: {
          onStateChange: (event) => {
            const ytTime = Math.floor(playerRef.current?.getCurrentTime?.() || 0);
            if (event.data === window.YT.PlayerState.PLAYING) {
              worker.postMessage({ type: 'RESUME', currentTime: ytTime });
            } else if (
              event.data === window.YT.PlayerState.PAUSED ||
              event.data === window.YT.PlayerState.BUFFERING
            ) {
              worker.postMessage({ type: 'PAUSE' });
            } else if (event.data === window.YT.PlayerState.ENDED) {
  worker.postMessage({ type: 'STOP' });
  // Автозбереження при закінченні відео
  const currentHistory = analysisModeRef.current === 'baseline'
  ? baselineHistoryRef.current
  : smartHighlightsRef.current;
  if (currentHistory.length > 0) {
    const blob = new Blob([JSON.stringify(currentHistory, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `report_${videoId}_auto.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
          },
        },
      });
    };

    if (window.YT?.Player) initPlayer();
    else {
      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id  = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = () => initPlayer();
    }
    return () => { if (workerRef.current) workerRef.current.terminate(); };
  }, [videoId, runAnalysisTick]);

  const downloadJSON = (data, name) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${name}.json`;
    a.click();
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const res = await fetch(`${BASELINE_URL}/generate_summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          mode: analysisMode,
          data: analysisMode === 'baseline' ? baselineHistory : smartHighlights,
        }),
      });
      const data = await res.json();
      setStreamSummary(data.summary);
    } catch (e) { console.error(e); }
    finally { setIsGeneratingSummary(false); }
  };

  const handleLoad = () => {
    const id = extractVideoId(inputUrl);
    if (id) { setVideoId(id); setError(''); }
    else setError('Invalid YouTube URL.');
  };

  const cooldownRemaining = Math.max(
    0,
    SMART_FRAME_COOLDOWN - (currentTime - lastFrameAnalyzedAtRef.current)
  );

  return (
    <div className="min-h-screen app-container flex flex-col xl:pt-20 desktop:pt-10">
      <div className="flex flex-wrap items-center gap-3 px-6 mt-6">
        <input
          type="text"
          className="input input-bordered flex-1 max-w-xl"
          placeholder="Paste YouTube URL..."
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleLoad}>Watch</button>
        <div className="flex items-center gap-1 bg-base-200 rounded-lg p-1">
          <button
            className={`btn btn-sm ${analysisMode === 'baseline' ? 'btn-neutral' : 'btn-ghost'}`}
            onClick={() => setAnalysisMode('baseline')}
          >
            Baseline
          </button>
          <button
            className={`btn btn-sm ${analysisMode === 'smart' ? 'btn-neutral' : 'btn-ghost'}`}
            onClick={() => setAnalysisMode('smart')}
          >
            Smart
          </button>
        </div>
        {(baselineHistory.length > 0 || smartHighlights.length > 0) && (
          <div className="flex gap-2">
            <button
              className="btn btn-outline btn-success btn-sm"
              onClick={() => downloadJSON(
                analysisMode === 'baseline' ? baselineHistory : smartHighlights,
                `report_${videoId}`
              )}
            >
              Download JSON
            </button>
            <button
              className="btn btn-outline btn-info btn-sm"
              onClick={handleGenerateSummary}
            >
              {isGeneratingSummary ? '...' : 'Generate Summary'}
            </button>
          </div>
        )}
      </div>

      {videoId && (
        <div className="flex flex-grow justify-around items-start flex-wrap mt-10 px-6">
          <div className="video-player-container flex-1">

            {/* Панель аналізу */}
            <div className="mb-4 p-4 bg-black rounded-lg border border-blue-900 font-mono text-[11px] shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-2 font-bold text-white uppercase">
                  <span className={`w-3 h-3 rounded-full ${
                    isAnalyzingBaseline || isAnalyzingSmart
                      ? 'bg-red-600 animate-pulse'
                      : 'bg-blue-600'
                  }`} />
                  {analysisMode === 'baseline' ? 'Baseline Vision' : 'Smart Engine'}
                </span>
                <span className="text-gray-500">{fmtTime(currentTime)}</span>
              </div>

              {analysisMode === 'baseline' && (
                <div className="grid grid-cols-1 gap-3 border-t border-blue-900 pt-3">
                  <div className="bg-blue-950/30 p-2 rounded border border-blue-800/40">
                    <p className="text-[10px] text-blue-300 mb-1 font-bold">DETAILED ACTION (VIDEO):</p>
                    <p className="text-white text-xs italic">
                      {baselineDetection?.full_description || 'Scanning video...'}
                    </p>
                  </div>
                  <div className="bg-green-950/20 p-2 rounded border border-green-800/40">
                    <p className="text-[10px] text-green-400 mb-1 font-bold">SPEECH (ASR):</p>
                    <p className="text-green-100 text-xs">
                      {typeof baselineDetection?.speech_content === 'string'
                        ? baselineDetection.speech_content
                        : 'Waiting for audio...'}
                    </p>
                  </div>
                </div>
              )}

              {analysisMode === 'smart' && (
                <div className="grid grid-cols-1 gap-3 border-t border-blue-900 pt-3">
                  {/* Ярус 0 */}
                  <div className="bg-gray-900/50 p-2 rounded border border-gray-700/40">
                    <p className="text-[10px] text-gray-400 mb-1 font-bold">LAYER 0 — LOCAL FILTER (free):</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            localScore >= 0.8 ? 'bg-green-500' : 'bg-gray-600'
                          }`}
                          style={{ width: `${(localScore * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold ${
                        localScore >= 0.7 ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        {localScore.toFixed(2)} {localScore >= 0.8 ? '→ NLP' : '✗ skip'}
                      </span>
                    </div>
                  </div>

                  {/* Ярус 1 */}
                  <div className="bg-purple-950/30 p-2 rounded border border-purple-800/40">
                    <p className="text-[10px] text-purple-300 mb-1 font-bold">
                      LAYER 1 — GEMINI NLP (~800 tokens):
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            (smartScore ?? 0) >= SMART_THRESHOLD ? 'bg-red-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${((smartScore ?? 0) * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${
                        (smartScore ?? 0) >= SMART_THRESHOLD ? 'text-red-400' : 'text-purple-300'
                      }`}>
                        {smartScore !== null ? smartScore.toFixed(2) : '—'}
                      </span>
                      <span className="text-gray-500 text-[10px]">/ {SMART_THRESHOLD}</span>
                    </div>
                    {lastSmartResult?.reason && (
                      <p className="text-gray-400 text-[10px] mt-1 italic">{lastSmartResult.reason}</p>
                    )}
                  </div>

                  {/* Ярус 2 — кулдаун */}
                  <div className="bg-blue-950/20 p-2 rounded border border-blue-800/40">
                    <p className="text-[10px] text-blue-300 mb-1 font-bold">
                      LAYER 2 — GEMINI CV (~1500 tokens) COOLDOWN:
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-500 transition-all"
                          style={{ width: `${(
                            (SMART_FRAME_COOLDOWN - cooldownRemaining) / SMART_FRAME_COOLDOWN * 100
                          ).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="text-blue-300 text-xs font-bold">
                        {cooldownRemaining > 0 ? `${cooldownRemaining}s` : '✓ READY'}
                      </span>
                    </div>
                  </div>

                  {/* Статус */}
                  <div className="bg-yellow-950/20 p-2 rounded border border-yellow-800/40">
                    <p className="text-[10px] text-yellow-300 mb-1 font-bold">STATUS:</p>
                    <p className="text-yellow-100 text-xs">
                      {isAnalyzingSmart
                        ? (smartScore ?? 0) >= SMART_THRESHOLD && cooldownRemaining === 0
                          ? '🔴 CV analyzing highlight...'
                          : '🟡 Gemini NLP scoring...'
                        : localScore < 0.2
                          ? '💤 Chat quiet — all layers skipped'
                          : (smartScore ?? 0) >= SMART_THRESHOLD && cooldownRemaining === 0
                            ? '⚡ Ready to trigger CV!'
                            : (smartScore ?? 0) >= SMART_THRESHOLD
                              ? `⏳ NLP peak, CV cooldown ${cooldownRemaining}s`
                              : '👁 NLP monitoring...'}
                    </p>
                  </div>

                  {/* Останній хайлайт */}
                  {smartHighlights.length > 0 && (
                    <div className="bg-green-950/20 p-2 rounded border border-green-800/40">
                      <p className="text-[10px] text-green-400 mb-1 font-bold">
                        LAST HIGHLIGHT ({smartHighlights.length} total):
                      </p>
                      <p className="text-green-100 text-xs">
                        {smartHighlights[smartHighlights.length - 1]?.insight || '—'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stream Summary */}
            {streamSummary && (
              <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-purple-800 font-mono text-xs text-white">
                <h3 className="text-purple-400 font-bold mb-2">📋 STREAM HIGHLIGHTS SUMMARY</h3>
                <div className="whitespace-pre-wrap">{streamSummary}</div>
              </div>
            )}

            {/* Відеоплеєр */}
            <div className="rounded-xl overflow-hidden mb-6 aspect-video bg-black shadow-2xl">
              <div ref={iframeRef} className="w-full h-full" />
            </div>
          </div>

          <div className="chat-sidebar w-full lg:w-[400px] ml-0 lg:ml-6">
            <ArchiveChatContainer
              messages={messages}
              currentTime={currentTime}
              isGenerating={false}
              topics={[]}
              languages={[]}
              paragraphSummary=""
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivePage;