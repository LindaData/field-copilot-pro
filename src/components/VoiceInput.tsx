import { Mic, MicOff } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props { onTranscript: (text: string) => void; samplePhrase?: string; }

export function VoiceInput({ onTranscript, samplePhrase = "229 volts" }: Props) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<unknown>(null);

  const start = () => {
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => unknown; SpeechRecognition?: new () => unknown }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!SR) {
      // Simulated capture
      setListening(true);
      toast("Voice capture (simulated)", { description: `Captured: "${samplePhrase}"` });
      setTimeout(() => {
        onTranscript(samplePhrase);
        setListening(false);
      }, 900);
      return;
    }
    try {
      const rec = new (SR as new () => {
        lang: string; interimResults: boolean; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void;
        onerror: (e: unknown) => void; onend: () => void; start: () => void; stop: () => void;
      })();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.onresult = (e) => { onTranscript(e.results[0][0].transcript); };
      rec.onerror = () => { toast.error("Voice recognition failed"); setListening(false); };
      rec.onend = () => setListening(false);
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      toast.error("Voice not available");
    }
  };

  const stop = () => {
    const rec = recRef.current as { stop: () => void } | null;
    rec?.stop?.();
    setListening(false);
  };

  return (
    <Button
      type="button"
      variant={listening ? "default" : "outline"}
      size="icon"
      className="touch-target shrink-0"
      onClick={listening ? stop : start}
      aria-label="Voice input"
    >
      {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </Button>
  );
}
