// Global state for Google TTS playback to coordinate across multiple hook instances
let globalAudio: HTMLAudioElement | null = null;
let globalQueue: string[] = [];
let globalIndex = 0;
let globalLang = 'kn';
let isPlayingGoogleTTS = false;
let globalOnEnd: (() => void) | null = null;

// Stop all speech (both browser speechSynthesis and Google TTS)
export const stopAllSpeech = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (globalAudio) {
    globalAudio.pause();
    globalAudio.src = '';
    globalAudio = null;
  }
  globalQueue = [];
  globalIndex = 0;
  isPlayingGoogleTTS = false;
  globalOnEnd = null;
};

// Split text into chunks safe for the Google Translate TTS character limit (approx 200 chars)
function splitTextIntoChunks(text: string, maxLength: number = 180): string[] {
  const chunks: string[] = [];
  const segments = text.split(/([.,!?|;\n\s]+)/);
  
  let currentChunk = "";
  for (const segment of segments) {
    if (!segment) continue;
    if ((currentChunk + segment).length > maxLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      if (segment.length > maxLength) {
        let temp = segment;
        while (temp.length > maxLength) {
          chunks.push(temp.substring(0, maxLength));
          temp = temp.substring(maxLength);
        }
        currentChunk = temp;
      } else {
        currentChunk = segment;
      }
    } else {
      currentChunk += segment;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

const playNextChunk = () => {
  if (globalIndex >= globalQueue.length) {
    isPlayingGoogleTTS = false;
    if (globalOnEnd) {
      const callback = globalOnEnd;
      globalOnEnd = null;
      callback();
    }
    return;
  }

  const chunk = globalQueue[globalIndex];
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${globalLang}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
  
  const audio = new Audio(url);
  globalAudio = audio;
  
  audio.play().catch(err => {
    console.warn("Google TTS playback error:", err);
    globalIndex++;
    playNextChunk();
  });

  audio.onended = () => {
    globalIndex++;
    playNextChunk();
  };

  audio.onerror = () => {
    console.warn("Google TTS chunk load error, skipping chunk.");
    globalIndex++;
    playNextChunk();
  };
};

export const speakViaGoogleTTS = (text: string, langCode: string, onEnd?: () => void) => {
  stopAllSpeech();
  
  const clean = text.replace(/[*#🌾🌿💧🌡️]/g, '').trim();
  if (!clean) return;
  
  globalQueue = splitTextIntoChunks(clean, 180);
  globalIndex = 0;
  globalLang = langCode.toLowerCase();
  globalOnEnd = onEnd || null;
  
  if (globalQueue.length > 0) {
    isPlayingGoogleTTS = true;
    playNextChunk();
  }
};

export function useSpeech() {
  const speak = (text: string, lang?: string, onEnd?: () => void) => {
    const langMap: Record<string, string> = {
      'EN': 'en-IN', 
      'HI': 'hi-IN', 
      'MR': 'mr-IN', 
      'KN': 'kn-IN', 
      'TA': 'ta-IN'
    };
    
    const langKey = lang || 'EN';
    const targetLang = langMap[langKey] || 'en-IN';
    const shortLangCode = targetLang.split('-')[0]; // 'kn', 'hi', 'en', 'mr', 'ta'
    
    const isOnline = navigator.onLine;
    const isRegional = ['kn', 'mr', 'ta', 'hi'].includes(shortLangCode);
    
    if (isOnline && isRegional) {
      speakViaGoogleTTS(text, shortLangCode, onEnd);
    } else {
      // Fallback/standard: browser native speech synthesis
      if (!('speechSynthesis' in window)) return;
      
      stopAllSpeech();
      
      const clean = text.replace(/[*#🌾🌿💧🌡️]/g, '').trim();
      if (!clean) return;

      const utterance = new SpeechSynthesisUtterance(clean);
      const voices = window.speechSynthesis.getVoices();
      
      // Find regional voice matching target language
      const voice = voices.find(v => v.lang.replace('_', '-') === targetLang) || 
                    voices.find(v => v.lang.startsWith(shortLangCode)) || 
                    voices[0];
                    
      if (voice) utterance.voice = voice;
      
      // Slower rate for better clarity for elderly/rural users
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      
      if (onEnd) {
        utterance.onend = () => onEnd();
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };
  
  const stop = () => {
    stopAllSpeech();
  };
  
  const isSpeaking = () => {
    const nativeSpeaking = 'speechSynthesis' in window ? window.speechSynthesis.speaking : false;
    return isPlayingGoogleTTS || nativeSpeaking;
  };
  
  return { speak, stop, isSpeaking };
}
