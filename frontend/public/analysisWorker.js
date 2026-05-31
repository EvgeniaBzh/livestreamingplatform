let intervalMs = 5000;
let isPaused   = true;
let videoTime  = 0;
let lastWallAt = null;
let timerId    = null;

self.onmessage = ({ data }) => {
  switch (data.type) {
    case 'START':
      if (data.interval  != null) intervalMs = data.interval;
      if (data.startTime != null) videoTime  = data.startTime;
      break;

    case 'PAUSE':
      if (!isPaused && lastWallAt !== null) {
        videoTime += (Date.now() - lastWallAt) / 1000;
      }
      isPaused   = true;
      lastWallAt = null;
      stopTicking();
      break;

    case 'RESUME':
      if (data.currentTime != null) videoTime = data.currentTime;
      isPaused   = false;
      lastWallAt = Date.now();
      startTicking();
      break;

    case 'SYNC':
      if (data.currentTime != null) {
        videoTime  = data.currentTime;
        if (!isPaused) lastWallAt = Date.now();
      }
      break;

    case 'STOP':
      stopTicking();
      isPaused  = true;
      videoTime = 0;
      break;
  }
};

function startTicking() {
  stopTicking();
  const tick = () => {
    if (isPaused) return;
    const now = Date.now();
    if (lastWallAt !== null) {
      videoTime += (now - lastWallAt) / 1000;
    }
    lastWallAt = now;
    self.postMessage({ type: 'TICK', currentTime: Math.floor(videoTime) });
    timerId = setTimeout(tick, intervalMs);
  };
  timerId = setTimeout(tick, intervalMs);
}

function stopTicking() {
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}