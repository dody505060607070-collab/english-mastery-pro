import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface PronunciationResult {
  score: number;
  transcript: string;
  feedback: string;
}

export const usePronunciation = (targetWord: string) => {
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const recognitionRef = useRef<any>(null);

  const calculateSimilarity = (spoken: string, target: string): number => {
    if (!spoken || !target) return 0;
    const s1 = spoken.toLowerCase().trim();
    const s2 = target.toLowerCase().trim();
    
    if (s1 === s2) return 100;
    
    // Simple Levenshtein-based similarity
    const track = Array(s2.length + 1).fill(null).map(() =>
      Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) {
      const row = track[0];
      if (row) row[i] = i;
    }
    for (let j = 0; j <= s2.length; j += 1) {
      const row = track[j];
      if (row) row[0] = j;
    }
    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        const currentRow = track[j];
        const prevRow = track[j - 1];
        if (currentRow && prevRow) {
          currentRow[i] = Math.min(
            currentRow[i - 1]! + 1,
            prevRow[i]! + 1,
            prevRow[i - 1]! + indicator,
          );
        }
      }
    }
    const finalRow = track[s2.length];
    const distance = finalRow ? finalRow[s1.length] : 0;
    const maxLength = Math.max(s1.length, s2.length);
    return maxLength === 0 ? 0 : Math.floor(((maxLength - (distance || 0)) / maxLength) * 100);
  };

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Your browser does not support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setResult(null);
    };

    recognition.onresult = (event: any) => {
      if (event.results && event.results[0] && event.results[0][0]) {
        const transcript = event.results[0][0].transcript;
        const score = calculateSimilarity(transcript, targetWord);
        
        let feedback = "Try again!";
        if (score >= 90) feedback = "Excellent! Perfect pronunciation";
        else if (score >= 70) feedback = "Very good, keep practicing";
        else if (score >= 40) feedback = "Good, but needs some improvement";

        setResult({ score, transcript, feedback });
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
      toast.error("An error occurred while recording audio.");
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [targetWord]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return { isRecording, startRecording, stopRecording, result };
};