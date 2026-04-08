const state = {
  stream: null,
  latestImageDataUrl: "",
  latestOcrText: "",
  latestRecognizedNumbers: [],
  lastOcrMeta: null,
  latestResponse: null,
  historyItems: [],
  revealedHints: new Set(),
  speechRecognition: null,
  isListening: false,
  preferredVoice: null,
  installPromptEvent: null,
};

const elements = {
  appModeBadge: document.getElementById("app-mode-badge"),
  installButton: document.getElementById("install-button"),
  cameraOverlay: document.getElementById("camera-overlay"),
  cameraPreview: document.getElementById("camera-preview"),
  closeCameraButton: document.getElementById("close-camera-button"),
  capturedPreview: document.getElementById("captured-preview"),
  cameraEmpty: document.getElementById("camera-empty"),
  captureCanvas: document.getElementById("capture-canvas"),
  startCameraButton: document.getElementById("start-camera-button"),
  captureButton: document.getElementById("capture-button"),
  imageUpload: document.getElementById("image-upload"),
  requestText: document.getElementById("request-text"),
  manualProblemNumber: document.getElementById("manual-problem-number"),
  typedProblemText: document.getElementById("typed-problem-text"),
  voiceButton: document.getElementById("voice-button"),
  analyzeButton: document.getElementById("analyze-button"),
  statusBox: document.getElementById("status-box"),
  selectedProblemNumber: document.getElementById("selected-problem-number"),
  problemSummary: document.getElementById("problem-summary"),
  problemNumberList: document.getElementById("problem-number-list"),
  translationText: document.getElementById("translation-text"),
  sourceExcerptText: document.getElementById("source-excerpt-text"),
  thinkingPromptText: document.getElementById("thinking-prompt-text"),
  ocrTextFull: document.getElementById("ocr-text-full"),
  ocrStatePill: document.getElementById("ocr-state-pill"),
  hintsGrid: document.getElementById("hints-grid"),
  revealAnswerButton: document.getElementById("reveal-answer-button"),
  answerAudioButton: document.getElementById("answer-audio-button"),
  finalAnswerText: document.getElementById("final-answer-text"),
  finalExplanationText: document.getElementById("final-explanation-text"),
  copyChatgptPromptButton: document.getElementById("copy-chatgpt-prompt-button"),
  shareChatgptPromptButton: document.getElementById("share-chatgpt-prompt-button"),
  speechStatusText: document.getElementById("speech-status-text"),
  historyList: document.getElementById("history-list"),
  clearHistoryButton: document.getElementById("clear-history-button"),
};

function init() {
  bindEvents();
  initializeVoiceInput();
  initializeSpeechOutput();
  initializeInstallPrompt();
  registerServiceWorker();
  loadHistory();
  renderEmptyHints();
  refreshFieldStates();
  resetAnswerCard();
  renderHistory();
  updateAppMode();
  updateCaptureButtonLabel();
}

function bindEvents() {
  elements.startCameraButton.addEventListener("click", startCamera);
  elements.captureButton.addEventListener("click", captureCurrentFrame);
  elements.closeCameraButton.addEventListener("click", closeCameraOverlay);
  elements.imageUpload.addEventListener("change", handleImageUpload);
  elements.voiceButton.addEventListener("click", handleVoiceInput);
  elements.analyzeButton.addEventListener("click", () => runAnalysis({ reuseOcr: false }));
  elements.revealAnswerButton.addEventListener("click", revealFinalAnswer);
  elements.answerAudioButton.addEventListener("click", playFinalAnswerAudio);
  elements.copyChatgptPromptButton.addEventListener("click", copyChatGptPrompt);
  elements.shareChatgptPromptButton.addEventListener("click", shareChatGptPrompt);
  elements.clearHistoryButton.addEventListener("click", clearHistory);
  elements.installButton.addEventListener("click", installApp);

  [elements.requestText, elements.manualProblemNumber, elements.typedProblemText].forEach((field) => {
    field.addEventListener("input", () => {
      syncFieldState(field);
      if (field === elements.requestText) {
        syncProblemNumberFromRequest();
      }
    });
  });

  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.requestText.value = button.dataset.prompt || "";
      syncProblemNumberFromRequest();
      refreshFieldStates();
      elements.requestText.focus();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.cameraOverlay.hidden) {
      closeCameraOverlay();
    }
  });
}

function updateAppMode() {
  const hasTesseract = Boolean(window.Tesseract);
  elements.appModeBadge.textContent = hasTesseract ? "로컬 OCR 모드" : "OCR 준비 중";
}

function setStatus(message) {
  elements.statusBox.textContent = message;
}

function setSpeechStatus(message) {
  elements.speechStatusText.textContent = message;
}

function setOcrState(message) {
  elements.ocrStatePill.textContent = message;
}

function syncFieldState(element) {
  element.classList.toggle("has-value", Boolean(String(element.value || "").trim()));
}

function refreshFieldStates() {
  [elements.requestText, elements.manualProblemNumber, elements.typedProblemText].forEach(syncFieldState);
}

function syncProblemNumberFromRequest() {
  const detectedNumber = extractProblemNumber(elements.requestText.value);
  if (!detectedNumber) return;
  elements.manualProblemNumber.value = detectedNumber;
  syncFieldState(elements.manualProblemNumber);
}

function updateCaptureButtonLabel() {
  elements.startCameraButton.textContent = state.latestImageDataUrl ? "다시 찍기" : "사진 찍기";
}

function showCameraOverlay() {
  elements.cameraOverlay.hidden = false;
  document.body.classList.add("has-camera-overlay");
}

function hideCameraOverlay() {
  elements.cameraOverlay.hidden = true;
  document.body.classList.remove("has-camera-overlay");
}

function stopCameraStream() {
  if (!state.stream) {
    elements.cameraPreview.srcObject = null;
    return;
  }

  state.stream.getTracks().forEach((track) => track.stop());
  state.stream = null;
  elements.cameraPreview.srcObject = null;
}

function setVoiceButtonState(mode) {
  elements.voiceButton.classList.remove("is-listening", "is-processing");

  if (mode === "unsupported") {
    elements.voiceButton.textContent = "미지원";
    elements.voiceButton.disabled = true;
    return;
  }

  elements.voiceButton.disabled = false;

  if (mode === "starting") {
    elements.voiceButton.textContent = "마이크 준비";
    elements.voiceButton.classList.add("is-processing");
    return;
  }

  if (mode === "listening") {
    elements.voiceButton.textContent = "듣는 중...";
    elements.voiceButton.classList.add("is-listening");
    return;
  }

  if (mode === "processing") {
    elements.voiceButton.textContent = "정리 중...";
    elements.voiceButton.classList.add("is-processing");
    return;
  }

  elements.voiceButton.textContent = "음성 입력";
}

function initializeInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.installPromptEvent = event;
    elements.installButton.hidden = false;
  });
}

async function installApp() {
  if (!state.installPromptEvent) return;
  state.installPromptEvent.prompt();
  await state.installPromptEvent.userChoice;
  state.installPromptEvent = null;
  elements.installButton.hidden = true;
}

function getAppBaseUrl() {
  return new URL("./", window.location.href);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    return;
  }
  const appBaseUrl = getAppBaseUrl();
  const serviceWorkerUrl = new URL("sw.js", appBaseUrl);
  navigator.serviceWorker
    .register(serviceWorkerUrl.href, { scope: appBaseUrl.pathname })
    .catch(() => {});
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("이 태블릿 브라우저에서는 카메라를 바로 열 수 없어요. 사진 업로드를 사용해 주세요.");
    return;
  }

  try {
    stopCameraStream();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    state.stream = stream;
    elements.cameraPreview.srcObject = stream;
    showCameraOverlay();
    setStatus("전체화면 촬영을 열었어요. 문제 한 개가 크게 보이게 맞춰 주세요.");
  } catch (error) {
    setStatus("카메라를 켜지 못했어요. 브라우저 권한을 확인하거나 사진 업로드를 사용해 주세요.");
  }
}

function closeCameraOverlay() {
  hideCameraOverlay();
  stopCameraStream();
  setStatus(
    state.latestImageDataUrl
      ? "촬영 화면을 닫았어요. 필요하면 다시 찍기를 눌러 주세요."
      : "촬영 화면을 닫았어요. 사진 업로드도 사용할 수 있어요."
  );
}

function captureCurrentFrame() {
  if (!elements.cameraPreview.srcObject) {
    setStatus("먼저 사진 찍기를 눌러 전체화면 촬영을 열어 주세요.");
    return "";
  }

  const { videoWidth, videoHeight } = elements.cameraPreview;
  if (!videoWidth || !videoHeight) {
    setStatus("카메라 화면이 아직 준비되지 않았어요. 잠깐 뒤에 다시 시도해 주세요.");
    return "";
  }

  const canvas = elements.captureCanvas;
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(elements.cameraPreview, 0, 0, videoWidth, videoHeight);
  state.latestImageDataUrl = canvas.toDataURL("image/png");
  elements.capturedPreview.src = state.latestImageDataUrl;
  elements.capturedPreview.hidden = false;
  elements.cameraEmpty.hidden = true;
  hideCameraOverlay();
  stopCameraStream();
  state.latestOcrText = "";
  state.latestRecognizedNumbers = [];
  state.lastOcrMeta = null;
  updateCaptureButtonLabel();
  setStatus("문제를 준비했어요.");
  return state.latestImageDataUrl;
}

function handleImageUpload(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    hideCameraOverlay();
    stopCameraStream();
    state.latestImageDataUrl = String(reader.result || "");
    state.latestOcrText = "";
    state.latestRecognizedNumbers = [];
    state.lastOcrMeta = null;
    elements.capturedPreview.src = state.latestImageDataUrl;
    elements.capturedPreview.hidden = false;
    elements.cameraEmpty.hidden = true;
    updateCaptureButtonLabel();
    setStatus("문제를 준비했어요.");
  };
  reader.readAsDataURL(file);
}

function initializeVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setVoiceButtonState("unsupported");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "ko-KR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    state.isListening = true;
    setVoiceButtonState("listening");
    setStatus("듣는 중이에요. 예: 2번 문제 도와줘");
  };
  recognition.onspeechend = () => {
    if (!state.isListening) return;
    setVoiceButtonState("processing");
    setStatus("말을 정리하고 있어요.");
  };
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim();
    if (!transcript) return;
    elements.requestText.value = transcript;
    const detectedNumber = extractProblemNumber(transcript);
    if (detectedNumber) {
      elements.manualProblemNumber.value = detectedNumber;
      syncFieldState(elements.manualProblemNumber);
    }
    syncFieldState(elements.requestText);
    setStatus(`"${transcript}" 라고 들었어요.`);
  };
  recognition.onend = () => {
    state.isListening = false;
    setVoiceButtonState("idle");
  };
  recognition.onerror = (event) => {
    state.isListening = false;
    setVoiceButtonState("idle");
    const errorMessages = {
      "no-speech": "소리가 잘 안 들렸어요. 조금 더 또렷하게 다시 말해 주세요.",
      "audio-capture": "마이크를 사용할 수 없어요. 브라우저 권한을 확인해 주세요.",
      "not-allowed": "마이크 권한이 필요해요. 브라우저에서 허용해 주세요.",
      aborted: "음성 입력을 멈췄어요.",
    };
    setStatus(errorMessages[event.error] || "음성 입력이 잘 안 됐어요. 텍스트로 입력해 주세요.");
  };
  state.speechRecognition = recognition;
  setVoiceButtonState("idle");
}

function handleVoiceInput() {
  if (!state.speechRecognition) {
    setStatus("이 태블릿 브라우저에서는 음성 입력을 지원하지 않아요.");
    return;
  }

  if (state.isListening) {
    state.speechRecognition.stop();
    setVoiceButtonState("processing");
    setStatus("음성 입력을 마무리하고 있어요.");
    return;
  }

  try {
    setVoiceButtonState("starting");
    state.speechRecognition.start();
    setStatus("마이크를 준비하고 있어요.");
  } catch (error) {
    state.isListening = false;
    setVoiceButtonState("idle");
    setStatus("음성 입력을 다시 시작하지 못했어요. 잠깐 뒤에 다시 시도해 주세요.");
  }
}

function initializeSpeechOutput() {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    elements.answerAudioButton.disabled = true;
    setSpeechStatus("이 태블릿 브라우저에서는 음성 읽기를 지원하지 않아요.");
    return;
  }

  loadSpeechVoices();
  if ("onvoiceschanged" in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadSpeechVoices;
  }
}

function loadSpeechVoices() {
  const voices = window.speechSynthesis.getVoices();
  state.preferredVoice =
    voices.find((voice) => voice.lang?.toLowerCase().startsWith("ko")) ||
    voices.find((voice) => voice.lang?.toLowerCase().startsWith("en")) ||
    null;
}

function stopCoachingAudio() {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  setSpeechStatus("음성 읽기를 멈췄어요.");
}

function speakText(text) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  const cleaned = String(text || "").trim();
  if (!cleaned) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.lang = state.preferredVoice?.lang || "ko-KR";
  utterance.voice = state.preferredVoice;
  utterance.rate = 0.94;
  utterance.pitch = 1.02;
  utterance.onstart = () => setSpeechStatus("태블릿에서 코칭 내용을 읽어주고 있어요.");
  utterance.onend = () => setSpeechStatus("읽기가 끝났어요. 다시 듣고 싶으면 버튼을 눌러 주세요.");
  utterance.onerror = () => setSpeechStatus("음성 읽기 중 문제가 생겼어요.");
  window.speechSynthesis.speak(utterance);
}

function playFinalAnswerAudio() {
  if (!state.latestResponse) {
    setSpeechStatus("먼저 문제를 분석해 주세요.");
    return;
  }
  if (elements.answerAudioButton.disabled) {
    setSpeechStatus("먼저 마지막 단계를 열어 주세요.");
    return;
  }

  speakText(
    [
      state.latestResponse.selectedProblemNumber
        ? `${state.latestResponse.selectedProblemNumber}번 문제 마지막 단계야.`
        : "마지막 단계 풀이를 읽어줄게.",
      `정답은 ${state.latestResponse.finalAnswer.answer}.`,
      state.latestResponse.finalAnswer.explanation,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

async function runAnalysis(options = {}) {
  const { reuseOcr = false } = options;
  const requestText = elements.requestText.value.trim();
  const manualProblemNumber = elements.manualProblemNumber.value.trim();
  const typedProblemText = elements.typedProblemText.value.trim();

  if (!requestText && !manualProblemNumber && !typedProblemText && !state.latestImageDataUrl) {
    setStatus("사진, 문제 문장, 문제 번호 중 하나는 먼저 준비해 주세요.");
    return;
  }

  elements.analyzeButton.disabled = true;
  stopCoachingAudio();

  let ocrText = state.latestOcrText;
  let recognizedProblemNumbers = [...state.latestRecognizedNumbers];

  try {
    if (state.latestImageDataUrl && (!reuseOcr || !ocrText)) {
      setStatus("이미지에서 글자를 읽는 중이에요. 태블릿에서 잠깐만 기다려 주세요.");
      setOcrState("OCR 분석 중");
      const ocrResult = await runClientSideOcr(state.latestImageDataUrl);
      ocrText = ocrResult.text;
      recognizedProblemNumbers = ocrResult.visibleProblemNumbers;
      state.latestOcrText = ocrText;
      state.latestRecognizedNumbers = recognizedProblemNumbers;
      setOcrState(ocrText ? "OCR 읽기 완료" : "OCR 결과 약함");
    }

    const payload = {
      requestText,
      manualProblemNumber,
      typedProblemText,
      ocrText,
      recognizedProblemNumbers,
    };
    const response = buildCoachingResponse(payload);
    response.ocrText = ocrText;
    renderResponse(response);
    saveHistoryItem({
      requestText,
      manualProblemNumber,
      typedProblemText,
      ocrText,
      response,
    });

    setStatus(buildReadyStatus(response));
  } catch (error) {
    setStatus(error.message || "이미지 분석 중 문제가 생겼어요.");
    setOcrState("OCR 실패");
  } finally {
    elements.analyzeButton.disabled = false;
  }
}

async function runClientSideOcr(imageDataUrl) {
  if (!window.Tesseract) {
    throw new Error("OCR 라이브러리를 아직 불러오지 못했어요. 인터넷 연결을 확인해 주세요.");
  }

  const preparedImage = await resizeImageDataUrl(imageDataUrl, 2200);
  const primaryImage = await preprocessImageForOcr(preparedImage, { mode: "balanced" });
  const primaryCandidate = await runOcrPass(primaryImage, "1차 읽기");

  let bestCandidate = primaryCandidate;
  let usedSecondPass = false;

  if (isWeakOcrCandidate(primaryCandidate)) {
    setStatus("1차 읽기가 약해서 선명 모드로 한 번 더 읽고 있어요.");
    const boostedImage = await preprocessImageForOcr(preparedImage, { mode: "strong" });
    const boostedCandidate = await runOcrPass(boostedImage, "2차 보정 읽기");
    bestCandidate = pickBetterOcrCandidate(primaryCandidate, boostedCandidate);
    usedSecondPass = true;
  }

  state.lastOcrMeta = {
    confidence: bestCandidate.confidence,
    score: bestCandidate.score,
    passLabel: bestCandidate.passLabel,
    usedSecondPass,
  };

  return {
    text: bestCandidate.text,
    visibleProblemNumbers: bestCandidate.visibleProblemNumbers,
  };
}

function preprocessImageForOcr(dataUrl, options = {}) {
  const { mode = "balanced" } = options;
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      for (let index = 0; index < pixels.length; index += 4) {
        const grayscale =
          pixels[index] * 0.299 +
          pixels[index + 1] * 0.587 +
          pixels[index + 2] * 0.114;
        const contrastFactor = mode === "strong" ? 1.9 : 1.45;
        let adjusted = (grayscale - 128) * contrastFactor + 128;

        if (mode === "strong") {
          adjusted = adjusted > 150 ? 255 : adjusted < 118 ? 0 : adjusted;
        } else {
          adjusted = adjusted > 225 ? 255 : adjusted < 20 ? 0 : adjusted;
        }

        const finalValue = clampChannel(adjusted);
        pixels[index] = finalValue;
        pixels[index + 1] = finalValue;
        pixels[index + 2] = finalValue;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("OCR 전처리용 이미지를 읽지 못했어요."));
    image.src = dataUrl;
  });
}

function resizeImageDataUrl(dataUrl, maxWidth) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      let ratio = 1;
      if (image.width > maxWidth) {
        ratio = maxWidth / image.width;
      } else if (image.width < 1500) {
        ratio = Math.min(maxWidth / image.width, 1.35);
      }
      const width = Math.round(image.width * ratio);
      const height = Math.round(image.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    image.src = dataUrl;
  });
}

async function runOcrPass(imageDataUrl, passLabel) {
  const result = await window.Tesseract.recognize(imageDataUrl, "eng", {
    logger(message) {
      if (message.status === "recognizing text" && typeof message.progress === "number") {
        const percent = Math.round(message.progress * 100);
        setStatus(`${passLabel} 중이에요. ${percent}%`);
      }
    },
  });

  const text = normalizeOcrText(result?.data?.text || "");
  const visibleProblemNumbers = extractVisibleProblemNumbers(text);
  const confidence = Number(result?.data?.confidence || 0);
  const score = calculateOcrScore(text, confidence, visibleProblemNumbers);

  return {
    passLabel,
    text,
    confidence,
    score,
    visibleProblemNumbers,
  };
}

function calculateOcrScore(text, confidence, visibleProblemNumbers) {
  const alphaCount = (String(text).match(/[A-Za-z]/g) || []).length;
  const lineCount = String(text)
    .split("\n")
    .filter(Boolean).length;
  const questionHint = /\b(what|who|where|when|how|color|blank|is|are|am)\b/i.test(text) ? 20 : 0;

  return confidence * 4 + alphaCount * 1.4 + text.length * 0.45 + visibleProblemNumbers.length * 35 + lineCount * 6 + questionHint;
}

function isWeakOcrCandidate(candidate) {
  const alphaCount = (String(candidate.text || "").match(/[A-Za-z]/g) || []).length;
  return candidate.confidence < 52 || candidate.text.length < 28 || alphaCount < 10;
}

function pickBetterOcrCandidate(firstCandidate, secondCandidate) {
  return secondCandidate.score >= firstCandidate.score ? secondCandidate : firstCandidate;
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function extractProblemNumber(text) {
  if (!text) return "";
  const lowered = text.toLowerCase();
  const patterns = [
    /(\d+)\s*번/,
    /number\s*(\d+)/,
    /question\s*(\d+)/,
    /no\.\s*(\d+)/,
    /(\d+)\s*problem/,
  ];
  for (const pattern of patterns) {
    const match = lowered.match(pattern);
    if (match) return match[1];
  }
  return extractKoreanProblemNumber(text);
}

function extractKoreanProblemNumber(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  const spokenNumbers = [
    ["1", ["한", "하나", "첫", "첫째", "일"]],
    ["2", ["두", "둘", "둘째", "이"]],
    ["3", ["세", "셋", "셋째", "삼"]],
    ["4", ["네", "넷", "넷째", "사"]],
    ["5", ["다섯", "오"]],
    ["6", ["여섯", "육"]],
    ["7", ["일곱", "칠"]],
    ["8", ["여덟", "팔"]],
    ["9", ["아홉", "구"]],
    ["10", ["열", "십"]],
  ];

  for (const [number, words] of spokenNumbers) {
    const pattern = new RegExp(`(?:^|\\s)(${words.join("|")})\\s*(?:번|번째|문제)`, "i");
    if (pattern.test(normalized)) {
      return number;
    }
  }
  return "";
}

function normalizeProblemNumbers(items) {
  const unique = [];
  for (const item of items || []) {
    const text = String(item || "").trim();
    if (text && !unique.includes(text)) unique.push(text);
  }
  return unique;
}

function extractVisibleProblemNumbers(text) {
  if (!text) return [];
  const patterns = [/^\s*(\d+)\s*[\.)]/gm, /^\s*(\d+)\s*번/gm, /\b(\d+)\s*\./g];
  const found = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const number = String(match[1] || "").trim();
      if (number && !found.includes(number)) found.push(number);
    }
  }
  return found;
}

function extractLeadingProblemNumber(line) {
  if (!line) return "";
  const patterns = [/^\s*(\d+)\s*[\.)]/, /^\s*(\d+)\s*번/];
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) return String(match[1] || "").trim();
  }
  return "";
}

function normalizeSentenceSpacing(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim();
}

function normalizeOcrText(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => normalizeSentenceSpacing(line))
    .filter(Boolean)
    .join("\n");
}

function extractProblemSegment(text, selectedNumber) {
  const normalizedNumber = String(selectedNumber || "").trim();
  if (!text || !normalizedNumber) return normalizeSentenceSpacing(text);

  const lines = String(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "";

  const starts = [];
  lines.forEach((line, index) => {
    const number = extractLeadingProblemNumber(line);
    if (number) starts.push([index, number]);
  });

  if (!starts.length) return normalizeSentenceSpacing(text);

  const trailingLines = lines.slice(starts[starts.length - 1][0] + 1);
  if (trailingLines.length && trailingLines.every((line) => !extractLeadingProblemNumber(line))) {
    const usableTrailing = trailingLines.filter(Boolean);
    if (usableTrailing.length >= starts.length) {
      const reconstructed = {};
      starts.forEach(([index, number], offset) => {
        reconstructed[number] = normalizeSentenceSpacing(`${lines[index]} ${usableTrailing[offset] || ""}`);
      });
      if (reconstructed[normalizedNumber]) return reconstructed[normalizedNumber];
    }
  }

  for (let index = 0; index < starts.length; index += 1) {
    const [startIndex, number] = starts[index];
    if (number !== normalizedNumber) continue;
    const endIndex = index + 1 < starts.length ? starts[index + 1][0] : lines.length;
    return normalizeSentenceSpacing(lines.slice(startIndex, endIndex).join(" "));
  }

  return normalizeSentenceSpacing(text);
}

function inferFinalAnswer(problemText, summary) {
  const lowered = String(problemText || "").toLowerCase();

  if (lowered.includes("what color is the sky")) {
    return { answer: "blue", explanation: "하늘 색을 묻는 문제라서 보통 blue를 떠올리면 돼." };
  }
  if (lowered.includes("ripe banana")) {
    return { answer: "yellow", explanation: "잘 익은 바나나는 보통 yellow라고 해." };
  }
  if (lowered.includes("sunflower")) {
    return { answer: "yellow", explanation: "해바라기는 보통 yellow를 떠올리면 돼." };
  }
  if (lowered.includes("grass")) {
    return { answer: "green", explanation: "grass는 보통 green과 가장 자연스럽게 이어져." };
  }
  if (lowered.includes("apple")) {
    return { answer: "red", explanation: "초등 영어 문제에서는 apple을 red와 연결하는 경우가 많아." };
  }
  if (lowered.includes("snow")) {
    return { answer: "white", explanation: "snow의 대표 색은 white라고 떠올리면 돼." };
  }
  if (summary.includes("빈칸")) {
    if (/\bwe\b/.test(lowered) || /\bthey\b/.test(lowered) || /\band\b/.test(lowered)) {
      return { answer: "are", explanation: "주어가 둘 이상이거나 we, they면 are를 먼저 생각해 볼 수 있어." };
    }
    if (/\bi\b/.test(lowered)) {
      return { answer: "am", explanation: "주어가 I일 때는 am을 쓰는 경우가 많아." };
    }
    if (
      /\bhe\b/.test(lowered) ||
      /\bshe\b/.test(lowered) ||
      /\bit\b/.test(lowered) ||
      lowered.startsWith("my teacher") ||
      lowered.startsWith("the food")
    ) {
      return { answer: "is", explanation: "주어가 한 사람 또는 한 개일 때는 is를 먼저 생각해 보자." };
    }
  }

  return null;
}

function buildDetailedFinalAnswer(sourceExcerpt, problemSummary, translation, thinkingPrompt) {
  const inferred = inferFinalAnswer(sourceExcerpt, problemSummary);
  if (inferred) {
    return {
      answer: inferred.answer,
      explanation: [
        translation,
        thinkingPrompt,
        inferred.explanation,
        `그래서 마지막 답은 ${inferred.answer}로 정리할 수 있어.`,
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  if (problemSummary.includes("색깔")) {
    return {
      answer: "대상의 대표 색",
      explanation:
        "이 문제는 색 이름을 고르는 문제야. 무엇의 색을 묻는지 먼저 찾고, 그 대상과 가장 자연스럽게 연결되는 색 단어를 마지막 답으로 말하면 돼.",
    };
  }

  if (problemSummary.includes("개수")) {
    return {
      answer: "숫자 답",
      explanation:
        "how many가 보이면 숫자로 답해야 해. 문장이나 그림에서 대상을 다시 세고, 그 숫자를 영어로 말하면 마지막 답이 돼.",
    };
  }

  if (problemSummary.includes("빈칸")) {
    return {
      answer: "빈칸에 가장 자연스러운 말",
      explanation:
        "빈칸 앞뒤를 같이 읽고 주어가 한 명인지 여러 명인지 먼저 봐야 해. 그다음 소리 내어 읽었을 때 가장 자연스럽게 이어지는 말을 마지막 답으로 고르면 돼.",
    };
  }

  if (problemSummary.includes("사람")) {
    return {
      answer: "사람을 가리키는 답",
      explanation:
        "who 문제는 사람 이름이나 사람을 가리키는 말을 답으로 고르면 돼. 문장 속에서 누구 이야기인지 다시 찾으면 마지막 답이 보여.",
    };
  }

  if (problemSummary.includes("장소")) {
    return {
      answer: "장소를 가리키는 답",
      explanation:
        "where 문제는 장소를 답으로 말해야 해. 문장 안에서 학교, 집, 공원처럼 장소 단서를 다시 보면 마지막 답을 정할 수 있어.",
    };
  }

  if (problemSummary.includes("무엇")) {
    return {
      answer: "질문이 가리키는 낱말",
      explanation:
        "what 문제는 질문이 무엇을 묻는지 먼저 찾고, 문장 속 핵심 낱말을 답으로 고르면 돼. 모르는 단어가 있어도 반복되는 단서를 먼저 보면 좋아.",
    };
  }

  return {
    answer: "문장을 더 크게 다시 확인하기",
    explanation:
      "이번에는 읽힌 문장이 약해서 정답을 딱 정하기 어려웠어. 문제를 더 크게 찍거나 직접 입력하면 마지막 단계 풀이가 훨씬 정확해져.",
  };
}

function buildCoachingResponse(payload) {
  const requestText = payload.requestText || "";
  const explicitSelectedNumber = String(payload.manualProblemNumber || "").trim() || extractProblemNumber(requestText);
  const recognized = normalizeProblemNumbers(
    payload.recognizedProblemNumbers || extractVisibleProblemNumbers(payload.ocrText || payload.typedProblemText || "")
  );

  let selectedProblemNumber = explicitSelectedNumber;
  if (selectedProblemNumber && !recognized.includes(selectedProblemNumber)) {
    recognized.push(selectedProblemNumber);
  }

  let sourceExcerpt = normalizeSentenceSpacing(payload.typedProblemText || "");
  if (payload.ocrText) {
    sourceExcerpt =
      extractProblemSegment(payload.ocrText, selectedProblemNumber) ||
      normalizeSentenceSpacing(payload.ocrText);
  }
  if (!sourceExcerpt) {
    sourceExcerpt = "문장 인식 결과가 약해서 다시 찍거나 직접 입력이 필요해요.";
  }

  let needsProblemNumberClarification = false;
  let clarificationMessage = "";
  if (!selectedProblemNumber && recognized.length > 1) {
    needsProblemNumberClarification = true;
    clarificationMessage = "사진에 여러 문제가 보여요. 몇 번 문제인지 한 번만 더 알려 주세요.";
  } else if (!selectedProblemNumber && recognized.length === 1) {
    selectedProblemNumber = recognized[0];
  } else if (!selectedProblemNumber) {
    selectedProblemNumber = "1";
  }

  const contextText = [sourceExcerpt, payload.ocrText || ""].filter(Boolean).join("\n").toLowerCase();
  let problemSummary = "문장 뜻을 이해하고 답을 찾는 문제";
  let translation = `${selectedProblemNumber}번 문제는 영어 문장을 읽고 맞는 답을 찾는 연습이야.`;
  let thinkingPrompt = "문장에서 아는 단어를 먼저 찾고, 질문이 무엇을 묻는지 생각해 보자.";
  let hints = [
    { title: "힌트 1", body: "문장 속에서 아는 단어를 먼저 표시해 보자." },
    { title: "힌트 2", body: "질문이 누구, 무엇, 어디, 색깔 중 무엇을 묻는지 생각해 보자." },
    { title: "힌트 3", body: "문장을 한국말로 짧게 바꾸면 답이 더 쉽게 보여." },
  ];
  let checkQuestion = "지금 가장 잘 맞는 답을 한 번 말해볼까?";

  if (contextText.includes("what color") || contextText.includes("color")) {
    problemSummary = "색깔을 묻는 문제";
    translation = "무슨 색인지 묻고 있는 문제야.";
    thinkingPrompt = "색 이름을 떠올리면서 무엇의 색을 묻는지 먼저 찾자.";
    hints = [
      { title: "힌트 1", body: "`color`가 보이면 색 이름을 생각하면 돼." },
      { title: "힌트 2", body: "무엇의 색을 묻는지 먼저 찾아보자." },
      { title: "힌트 3", body: "그 대상과 가장 잘 어울리는 색 단어를 말해 보자." },
    ];
    checkQuestion = "어떤 색 이름이 가장 잘 맞을까?";
  } else if (contextText.includes("how many")) {
    problemSummary = "개수나 숫자를 묻는 문제";
    translation = "몇 개인지 묻는 문제야.";
    thinkingPrompt = "숫자와 셀 수 있는 대상을 같이 보자.";
    hints = [
      { title: "힌트 1", body: "`how many`는 몇 개인지 물을 때 써." },
      { title: "힌트 2", body: "문장 안에서 세는 대상을 먼저 찾아보자." },
      { title: "힌트 3", body: "그 대상이 몇 개인지 그림이나 문장 단서를 다시 보자." },
    ];
    checkQuestion = "몇 개라고 하면 자연스러울까?";
  } else if (contextText.includes("blank") || contextText.includes("fill in") || /_+/.test(sourceExcerpt + payload.ocrText)) {
    problemSummary = "빈칸에 들어갈 알맞은 단어를 찾는 문제";
    translation = "빈칸 앞뒤 뜻을 보고 어떤 말이 가장 자연스러운지 찾는 문제야.";
    thinkingPrompt = "빈칸 앞 단어와 뒤 단어를 같이 읽어 보자.";
    hints = [
      { title: "힌트 1", body: "빈칸 앞뒤 단어를 먼저 읽어 보자." },
      { title: "힌트 2", body: "들어갈 말이 사람 하나인지, 여러 개를 말하는지 생각해 보자." },
      { title: "힌트 3", body: "문장을 소리 내어 읽고 가장 자연스럽게 이어지는 말을 골라 보자." },
    ];
    checkQuestion = "어떤 단어를 넣으면 문장이 가장 자연스러울까?";

    if (sourceExcerpt.toLowerCase().includes(" and ")) {
      thinkingPrompt = "주어가 둘 이상인지 먼저 보고, 문장이 자연스럽게 이어지는지 생각해 보자.";
      hints = [
        { title: "힌트 1", body: "주어에 두 대상이 함께 나오는지 먼저 찾아보자." },
        { title: "힌트 2", body: "둘 이상이면 한 개일 때와 다른 말이 올 수 있어." },
        { title: "힌트 3", body: "문장을 천천히 읽고 둘 이상을 가리킬 때 쓰는 말을 떠올려 보자." },
      ];
      checkQuestion = "둘 이상을 말하는 문장에는 어떤 말이 가장 잘 어울릴까?";
    }
  } else if (contextText.includes("who")) {
    problemSummary = "사람을 묻는 문제";
    translation = "`who`는 누구인지 물을 때 쓰는 말이야.";
    thinkingPrompt = "사람 이름이나 사람을 가리키는 말을 먼저 찾아보자.";
  } else if (contextText.includes("where")) {
    problemSummary = "장소를 묻는 문제";
    translation = "`where`는 어디인지 묻는 문제야.";
    thinkingPrompt = "장소 이름이 나올 만한 단어를 먼저 찾아보자.";
  } else if (contextText.includes("what")) {
    problemSummary = "무엇인지 묻는 문제";
    translation = "`what`은 무엇인지 물을 때 쓰는 말이야.";
    thinkingPrompt = "질문이 무엇을 알고 싶은지 먼저 찾아보자.";
  }

  const finalAnswer = buildDetailedFinalAnswer(sourceExcerpt, problemSummary, translation, thinkingPrompt);

  return {
    selectedProblemNumber,
    recognizedProblemNumbers: recognized,
    needsProblemNumberClarification,
    clarificationMessage,
    sourceExcerpt,
    problemSummary,
    translation,
    thinkingPrompt,
    hints,
    checkQuestion,
    finalAnswer,
  };
}

function renderResponse(response) {
  state.latestResponse = response;
  state.revealedHints = new Set();
  elements.selectedProblemNumber.textContent = response.selectedProblemNumber ? `${response.selectedProblemNumber}번` : "선택 필요";
  elements.problemSummary.textContent = response.problemSummary;
  elements.sourceExcerptText.textContent = response.sourceExcerpt;
  elements.translationText.textContent = response.translation;
  elements.thinkingPromptText.textContent = response.thinkingPrompt;
  elements.ocrTextFull.textContent = state.latestOcrText || "이번에는 OCR 없이 입력한 문제를 기준으로 코칭했어요.";
  resetAnswerCard(response);
  renderProblemChips(response);
  renderHints(response.hints);
}

function resetAnswerCard(response = state.latestResponse) {
  elements.finalAnswerText.textContent = "정답과 풀이를 아직 열지 않았어요.";
  elements.finalExplanationText.textContent = response?.checkQuestion
    ? `${response.checkQuestion} 힌트를 다 본 뒤 마지막 단계를 열어 주세요.`
    : "힌트를 먼저 본 뒤 마지막 단계에서 정답과 풀이를 확인해 주세요.";
  elements.answerAudioButton.disabled = true;
}

function buildOcrGuidance(response) {
  const ocrText = String(state.latestOcrText || "").trim();
  const selectedNumber = String(response?.selectedProblemNumber || "").trim();
  const recognized = response?.recognizedProblemNumbers || [];
  const meta = state.lastOcrMeta || {};

  if (!state.latestImageDataUrl && !ocrText) {
    return "지금은 사진 없이 직접 입력만 기준으로 코칭하고 있어요.";
  }
  if (!ocrText) {
    return "글자 읽기가 약했어요. 문제 한 개만 크게 보이게 하고, 화면 재촬영보다 문제집 종이나 원본 이미지를 직접 넣는 쪽이 더 잘 읽혀요.";
  }
  if (meta.usedSecondPass && meta.confidence < 55) {
    return "첫 번째 읽기가 약해서 선명 모드로 한 번 더 읽었어요. 문제 번호와 문장이 함께 크게 보이게 다시 찍으면 더 좋아져요.";
  }
  if (response?.needsProblemNumberClarification) {
    return "한 장에 여러 문제가 함께 보여요. 문제 번호를 먼저 고르면 훨씬 정확해져요.";
  }
  if (recognized.length > 1 && selectedNumber) {
    return `${recognized.length}개의 문제 번호를 읽었고, 지금은 ${selectedNumber}번만 골라서 보고 있어요.`;
  }
  if (!recognized.length) {
    return "문제 번호는 잘 안 보여요. 번호가 화면 안에 함께 들어오게 더 가까이 찍고, 가능하면 한 문제만 크게 보이게 해 보세요.";
  }
  if (meta.confidence && meta.confidence < 58) {
    return "읽기는 됐지만 아직 자신감이 낮아요. 빛 반사를 줄이고 글자가 화면에서 더 크게 보이게 찍으면 더 안정적이에요.";
  }
  if (ocrText.length < 28) {
    return "읽힌 글자가 짧아요. 문제 전체보다 문장 부분이 크게 들어오게 다시 찍어 보세요.";
  }
  return "글자 읽기 상태가 괜찮아요. 힌트를 먼저 본 뒤 마지막에만 정답을 열어 주세요.";
}

function buildReadyStatus(response) {
  if (response.needsProblemNumberClarification) {
    return response.clarificationMessage;
  }
  const guidance = buildOcrGuidance(response);
  if (!state.latestOcrText || guidance.includes("약") || guidance.includes("번호") || guidance.includes("다시 찍")) {
    return guidance;
  }
  return "코칭 결과를 만들었어요. 힌트를 1단계부터 열어 주세요.";
}

function loadHistory() {
  try {
    const saved = localStorage.getItem("study-helper-sa-tablet-history");
    state.historyItems = saved ? JSON.parse(saved) : [];
  } catch (error) {
    state.historyItems = [];
  }
}

function persistHistory() {
  try {
    localStorage.setItem(
      "study-helper-sa-tablet-history",
      JSON.stringify(state.historyItems.slice(0, 8))
    );
  } catch (error) {
    // Ignore storage failures on restricted browsers.
  }
}

function saveHistoryItem(entry) {
  const item = {
    savedAt: new Date().toISOString(),
    requestText: entry.requestText,
    manualProblemNumber: entry.manualProblemNumber,
    typedProblemText: entry.typedProblemText,
    ocrText: entry.ocrText,
    response: entry.response,
  };

  state.historyItems = [
    item,
    ...state.historyItems.filter(
      (existing) =>
        !(
          existing.response?.sourceExcerpt === item.response?.sourceExcerpt &&
          existing.response?.selectedProblemNumber === item.response?.selectedProblemNumber
        )
    ),
  ].slice(0, 8);

  persistHistory();
  renderHistory();
}

function clearHistory() {
  state.historyItems = [];
  persistHistory();
  renderHistory();
  setStatus("이 기기에 저장된 최근 코칭 기록을 비웠어요.");
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  elements.clearHistoryButton.disabled = state.historyItems.length === 0;

  if (!state.historyItems.length) {
    const empty = document.createElement("article");
    empty.className = "history-card empty";
    empty.innerHTML =
      "<strong>아직 저장된 기록이 없어요.</strong><p>문제를 한 번 분석하면 최근 기록이 여기에 쌓입니다.</p>";
    elements.historyList.appendChild(empty);
    return;
  }

  state.historyItems.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-card";
    button.innerHTML = `
      <span class="meta">${formatSavedAt(item.savedAt)}</span>
      <strong>${item.response?.selectedProblemNumber ? `${item.response.selectedProblemNumber}번` : "문제 번호 없음"} · ${item.response?.problemSummary || "문제 유형 없음"}</strong>
      <p>${item.response?.sourceExcerpt || "읽은 문제 없음"}</p>
    `;
    button.addEventListener("click", () => restoreHistoryItem(item));
    elements.historyList.appendChild(button);
  });
}

function restoreHistoryItem(item) {
  elements.requestText.value = item.requestText || "";
  elements.manualProblemNumber.value = item.manualProblemNumber || "";
  elements.typedProblemText.value = item.typedProblemText || "";
  state.latestOcrText = item.ocrText || "";
  state.latestRecognizedNumbers = item.response?.recognizedProblemNumbers || [];
  refreshFieldStates();
  renderResponse(item.response);
  setStatus("최근 기록을 다시 불러왔어요.");
}

function formatSavedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "저장 시간 알 수 없음";
  return date.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderProblemChips(response) {
  elements.problemNumberList.innerHTML = "";
  const numbers = response.recognizedProblemNumbers || [];
  if (!numbers.length) {
    const chip = document.createElement("span");
    chip.className = "number-chip";
    chip.textContent = "문제 번호 인식 없음";
    elements.problemNumberList.appendChild(chip);
    return;
  }

  numbers.forEach((number) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "number-chip";
    button.textContent = `${number}번`;
    if (number === response.selectedProblemNumber) {
      button.classList.add("is-selected");
    }
    button.addEventListener("click", () => {
      elements.manualProblemNumber.value = number;
      elements.requestText.value = `${number}번 문제 도와줘`;
      refreshFieldStates();
      runAnalysis({ reuseOcr: true });
    });
    elements.problemNumberList.appendChild(button);
  });
}

function renderEmptyHints() {
  renderHints([
    { title: "힌트 1", body: "사진이나 직접 입력한 문장을 먼저 준비해 보자." },
    { title: "힌트 2", body: "몇 번 문제인지 알려주면 더 정확하게 도와줄 수 있어." },
    { title: "힌트 3", body: "정답보다 먼저 단서를 살피는 연습을 해 보자." },
  ]);
}

function renderHints(hints) {
  elements.hintsGrid.innerHTML = "";

  hints.forEach((hint, index) => {
    const card = document.createElement("article");
    card.className = "hint-card";

    const top = document.createElement("div");
    top.className = "hint-top";
    top.innerHTML = `<h3>${hint.title}</h3><span class="hint-index">${index + 1}</span>`;

    const body = document.createElement("p");
    body.className = "hint-body is-hidden";
    body.textContent = hint.body;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "pill subtle";
    button.textContent = `${index + 1}단계 힌트 열기`;

    const audioButton = document.createElement("button");
    audioButton.type = "button";
    audioButton.className = "pill secondary compact";
    audioButton.textContent = "자동 읽기";
    audioButton.disabled = true;

    button.addEventListener("click", () => {
      body.classList.remove("is-hidden");
      state.revealedHints.add(index);
      button.disabled = true;
      button.textContent = "힌트 열림";
      audioButton.disabled = false;
    });

    audioButton.addEventListener("click", () => {
      speakText(`힌트 ${index + 1}. ${hint.body}`);
    });

    const actions = document.createElement("div");
    actions.className = "hint-actions";
    actions.append(button, audioButton);

    card.append(top, body, actions);
    elements.hintsGrid.appendChild(card);
  });
}

function revealFinalAnswer() {
  if (!state.latestResponse) {
    setStatus("먼저 문제를 분석해 주세요.");
    return;
  }

  const totalHints = state.latestResponse.hints?.length || 0;
  if (state.revealedHints.size < totalHints) {
    setStatus("정답은 힌트를 다 본 뒤에 열 수 있어요.");
    return;
  }

  elements.finalAnswerText.textContent = state.latestResponse.finalAnswer.answer;
  elements.finalExplanationText.textContent = state.latestResponse.finalAnswer.explanation;
  elements.answerAudioButton.disabled = false;
  setStatus("이제 정답과 풀이를 열었어요. 먼저 아이가 스스로 답을 말해보게 해 주세요.");
}

function buildChatGptPrompt(mode = "child-deep") {
  const response = state.latestResponse;
  if (!response) return "";

  if (mode === "parent-summary") {
    return [
      "초등학교 2학년 아이를 돕는 부모에게 설명하듯 답해줘.",
      "요청: 아이에게 바로 정답을 말하지 않도록 지도하는 방식으로 설명해줘.",
      "형식: 1) 문제 핵심 2) 아이에게 줄 힌트 3개 3) 부모가 체크할 포인트 4) 마지막 정답과 이유.",
      `아이 요청: ${elements.requestText.value.trim() || "없음"}`,
      `선택 문제 번호: ${response.selectedProblemNumber || "없음"}`,
      `문제 유형: ${response.problemSummary || "없음"}`,
      `문제 뜻: ${response.translation || "없음"}`,
      `집중 문제: ${response.sourceExcerpt || "없음"}`,
      `OCR 전체 텍스트: ${state.latestOcrText || "없음"}`,
    ].join("\n");
  }

  return [
    "초등학교 2학년 아이의 영어 숙제를 도와주는 튜터처럼 답해줘.",
    "규칙: 정답을 첫 문장에 말하지 말고, 쉬운 한국어로 힌트 3개를 먼저 주고 마지막에만 정답과 이유를 알려줘.",
    "추가 요청: 아이가 스스로 답을 떠올릴 수 있게, 각 힌트를 조금 더 자세하고 친절하게 설명해줘.",
    `아이 요청: ${elements.requestText.value.trim() || "없음"}`,
    `선택 문제 번호: ${response.selectedProblemNumber || "없음"}`,
    `문제 유형: ${response.problemSummary || "없음"}`,
    `문제 뜻: ${response.translation || "없음"}`,
    `집중 문제: ${response.sourceExcerpt || "없음"}`,
    `OCR 전체 텍스트: ${state.latestOcrText || "없음"}`,
  ].join("\n");
}

async function copyChatGptPrompt() {
  const text = buildChatGptPrompt("child-deep");
  if (!text) {
    setStatus("먼저 문제를 분석한 뒤에 ChatGPT 질문을 복사할 수 있어요.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus("ChatGPT용 질문을 복사했어요.");
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    setStatus("ChatGPT용 질문을 복사했어요.");
  }
}

async function shareChatGptPrompt() {
  const text = buildChatGptPrompt("child-deep");
  if (!text) {
    setStatus("먼저 문제를 분석한 뒤에 공유할 수 있어요.");
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Study Helper for SA",
        text,
      });
      setStatus("ChatGPT용 질문을 공유했어요.");
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        setStatus("공유가 취소됐어요.");
        return;
      }
    }
  }

  await copyChatGptPrompt();
}

init();
