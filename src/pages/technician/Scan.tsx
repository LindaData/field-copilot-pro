import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { Camera, ScanLine, Check, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Scan() {
  const { state, updateJob } = useStore();
  const [scanning, setScanning] = useState(false);
  const [recognized, setRecognized] = useState<null | { mfg: string; model: string; serial: string; voltage: string; phase: string; refrig: string; cap: string }>(null);
  const nav = useNavigate();

  const simulate = () => {
    setScanning(true);
    setTimeout(() => {
      setRecognized({
        mfg: "Goodman", model: "GSXN3N2410A*", serial: "2403A12345",
        voltage: "208/230 V", phase: "Single", refrig: "R-410A", cap: "24,000 BTU/h (2 ton)",
      });
      setScanning(false);
      toast.success("Data plate recognized (demo)");
    }, 1200);
  };

  const confirm = () => {
    const job = state.jobs.find((j) => j.status === "On Site");
    if (job) updateJob(job.id, { equipmentId: "eq-1" });
    toast.success("Equipment attached to job");
    nav("/app/equipment/eq-1");
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4">
        <div className="text-sm font-semibold">Scan data plate</div>
        <div className="mt-1 text-xs text-muted-foreground">Point your camera at the equipment data plate, or upload a photo. The demo recognizer is pre-seeded for the Goodman GSXN3N2410A* unit on today's On Site job.</div>

        <div className="mt-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary/90 to-primary-soft text-primary-foreground">
          <div className="relative h-full w-full">
            <div className="absolute inset-6 rounded-lg border-2 border-dashed border-accent/80">
              <div className="absolute inset-0 flex items-center justify-center">
                {scanning ? (
                  <div className="flex flex-col items-center gap-2">
                    <ScanLine className="h-10 w-10 animate-pulse-soft text-accent" />
                    <div className="text-xs">Reading data plate…</div>
                  </div>
                ) : recognized ? (
                  <Check className="h-12 w-12 text-success" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-xs opacity-80">
                    <Camera className="h-10 w-10" />
                    <div>Camera preview placeholder<br />(tap “Simulate scan” below)</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={simulate} disabled={scanning} className="touch-target h-12">
            <ScanLine className="mr-2 h-5 w-5" /> Simulate scan
          </Button>
          <Button variant="outline" disabled className="touch-target h-12">
            <Camera className="mr-2 h-5 w-5" /> Upload photo
          </Button>
        </div>
      </div>

      {recognized && (
        <div className="card-elev p-4">
          <div className="text-sm font-semibold">Confirm recognized values</div>
          <p className="mt-1 text-xs text-muted-foreground">Edit anything that doesn't match the plate. The Goodman demo values are pre-filled.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {Object.entries(recognized).map(([k, v]) => (
              <label key={k} className="flex flex-col text-xs">
                <span className="font-medium uppercase tracking-wide text-muted-foreground">{k}</span>
                <input
                  defaultValue={v}
                  className="touch-target mt-1 rounded-md border bg-background px-2 text-sm"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 rounded-md border border-accent/40 bg-accent/10 p-2 text-xs text-accent-foreground inline-flex gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Always confirm the data plate matches before attaching to the job. The recognizer is a demo and may misread blurry plates.</span>
          </div>
          <Button onClick={confirm} className="touch-target mt-4 h-12 w-full">Confirm & attach to job</Button>
        </div>
      )}
    </div>
  );
}
