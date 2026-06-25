import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Training() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4 text-center">
        <GraduationCap className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-2 text-base font-semibold">Training mode</h1>
        <p className="mt-1 text-sm text-muted-foreground">Run the no-cooling scenario without real customer details. The Diagnostic explains why each test is performed; scoring on sequencing, safety acknowledgments, measurement interpretation, and escalation choices is on the V2 roadmap.</p>
        <Link to="/app/jobs/j-1/diagnose"><Button className="touch-target mt-4 w-full h-12">Start practice run</Button></Link>
      </div>
    </div>
  );
}
