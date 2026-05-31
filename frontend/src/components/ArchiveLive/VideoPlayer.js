import React, { useRef, useEffect, useState, useCallback } from "react";
import { storage } from "../../firebaseConfig";
import { ref, getDownloadURL } from "firebase/storage";

const VideoPlayer = ({
  metadata,
  selectedVideoId,
  chatData,
  setAllShownMessages,
  setDisplayedMessages,
  intervals,
  onIntervalChange,
}) => {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [currentIntervalIndex, setCurrentIntervalIndex] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showPauseOverlay, setShowPauseOverlay] = useState(false);
  const [currentPauseInfo, setCurrentPauseInfo] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [initialTimeSet, setInitialTimeSet] = useState(false);
  const [processedPauses, setProcessedPauses] = useState(new Set());

  // ==================== НОВІ СТЕЙТИ ДЛЯ BASELINE AI (VISION + AUDIO) ====================
  const [visionData, setVisionData] = useState({
    label: "---",
    confidence: 0,
    timestamp: 0,
    speech: "",
    status: "IDLE"
  });
  const [analysisReport, setAnalysisReport] = useState([]);

  // Функція для аналізу кадру та аудіо через Python Baseline Server (Port 5002)
  // Знайти функцію sendFrameToAI та замінити її логіку збереження:
  const sendFrameToAI = useCallback(async (currentTime) => {
    if (!selectedVideoId || !videoLoaded) return;

    try {
      setVisionData(prev => ({ ...prev, status: "ANALYZING" }));
      
      const response = await fetch('http://localhost:5002/analyze_frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: selectedVideoId,
          timestamp: Math.floor(currentTime)
        })
      });

      const result = await response.json();

      if (result && !result.error) {
        // Формуємо об'єкт так, щоб у ньому були ВСІ дані для звіту
        const frameInfo = {
          time: result.timestamp,
          label: result.label,
          confidence: Number(result.confidence), // Зберігаємо числом для валідності JSON
          speech: result.speech_content,        // ТЕПЕР ЦЕ ПІДЕ У ФАЙЛ
          full_desc: result.full_description,   // І ЦЕ ТЕЖ
          logTime: new Date().toLocaleTimeString()
        };

        setVisionData({
          label: frameInfo.label,
          confidence: (frameInfo.confidence * 100).toFixed(1),
          timestamp: frameInfo.time,
          speech: frameInfo.speech,
          status: "ACTIVE"
        });

        // Накопичуємо дані
        setAnalysisReport(prev => [...prev, frameInfo]);
      }
    } catch (err) {
      console.error("Vision AI Error:", err);
      setVisionData(prev => ({ ...prev, status: "OFFLINE" }));
    }
  }, [selectedVideoId, videoLoaded]);

  // Таймер для щосекундного аналізу (Еталонний метод)
  useEffect(() => {
    let interval;
    if (videoLoaded && videoRef.current && !videoRef.current.paused) {
      interval = setInterval(() => {
        sendFrameToAI(videoRef.current.currentTime);
      }, 1000); // Аналіз кожну секунду
    }
    return () => clearInterval(interval);
  }, [videoLoaded, sendFrameToAI]);

  // Функція для завантаження накопиченого звіту
  const downloadReport = () => {
    if (analysisReport.length === 0) {
      alert("No data collected yet!");
      return;
    }

    const report = {
      videoId: selectedVideoId,
      timestamp: new Date().toISOString(),
      analysisType: "BASELINE_FULL_SCAN_STT", // Оновили назву типу аналізу
      totalFramesAnalyzed: analysisReport.length,
      data: analysisReport.map(item => ({
        time: item.time,
        label: item.label,
        confidence: item.confidence,
        speech: item.speech || "No speech detected", // ГАРАНТОВАНЕ ПОЛЕ
        context: item.full_desc || ""               // ГАРАНТОВАНЕ ПОЛЕ
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `baseline_report_${selectedVideoId}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==================== ОРИГІНАЛЬНА ЛОГІКА ВІДЕО ====================

  useEffect(() => {
    if (!metadata || !videoRef.current) return;

    const loadVideo = async () => {
      try {
        if (!metadata.videoURL) throw new Error("No videoURL");
        videoRef.current.src = metadata.videoURL;
        videoRef.current.load();
        setVideoLoaded(true);
      } catch (err) {
        setError(err.message);
      }
    };
    loadVideo();
    setAnalysisReport([]); // Скидаємо звіт при зміні відео
  }, [metadata, selectedVideoId]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || !intervals || intervals.length === 0) return;
    const currentTime = videoRef.current.currentTime;
    const currentInterval = intervals[currentIntervalIndex];

    // Оновлення чату
    const messagesToShow = chatData.filter(m => m.timestamp <= currentTime);
    setAllShownMessages(messagesToShow);
    setDisplayedMessages(messagesToShow.slice(-50));

    // Перевірка кінця інтервалу
    if (currentTime >= currentInterval.endTime) {
      videoRef.current.pause();
      setShowOverlay(true);
    }
  };

  return (
    <div className="video-player-container relative p-4 bg-gray-900 rounded-xl shadow-2xl">
      <div className="flex flex-col gap-4">
        {/* Кнопки керування звітом */}
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
             <div className={`w-3 h-3 rounded-full ${visionData.status === 'ACTIVE' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
             <span className="text-xs text-gray-400 font-mono">AI ENGINE: {visionData.status}</span>
          </div>
          <button 
            onClick={downloadReport}
            className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded transition"
          >
            Download Analysis Report ({analysisReport.length} frames)
          </button>
        </div>

        {/* Плеєр */}
        <div className="bg-black rounded-lg overflow-hidden w-[800px] h-[450px] relative border border-gray-700">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            controls
            crossOrigin="anonymous"
            muted
          />
          {showOverlay && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
              <button onClick={() => { setShowOverlay(false); videoRef.current.play(); }} className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold">Continue Watching</button>
            </div>
          )}
        </div>

        {/* BASELINE AI PANEL (Нижня панель моніторингу) */}
        <div className="w-[800px] bg-black border border-green-900/50 p-4 rounded-lg font-mono text-sm">
          <div className="flex justify-between border-b border-green-900/30 pb-2 mb-2 text-green-500 uppercase tracking-widest">
            <span>● Baseline AI Vision Engine (5002)</span>
            <span>Status: {visionData.status}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-green-400">
            <div>
              <p className="text-gray-500 text-xs">TIMESTAMP: <span className="text-green-400">{visionData.timestamp}s</span></p>
              <p className="text-gray-500 text-xs">CONFIDENCE: <span className="text-green-400">{visionData.confidence}%</span></p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">DETECTED: <span className="text-white bg-green-900/40 px-1">{visionData.label}</span></p>
              <p className="text-gray-500 text-xs">GPU LOAD: <span className="text-red-500">CONSTANT LOAD</span></p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-green-900/20">
             <p className="text-gray-500 text-xs mb-1 italic">SPEECH-TO-TEXT (ASR):</p>
             <p className="text-white leading-tight min-h-[1.5em]">
               {visionData.speech || <span className="text-gray-700">Waiting for speech detection...</span>}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;