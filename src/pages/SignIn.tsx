import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const nav = useNavigate();
  const { setRole } = useStore();

  return (
    <div className="min-h-screen bg-primary text-primary-foreground">
      <div className="mx-auto max-w-md px-5 py-10 safe-top">
        <Link to="/" className="text-sm opacity-80 underline">← Back to demo</Link>
        <h1 className="mt-4 text-2xl font-bold">Sign In</h1>
        <p className="mt-1 text-sm opacity-80">Real authentication is stubbed in this prototype. Use any email and password to continue, or go back and pick a guest role.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email || !pw) { toast.error("Enter email and password"); return; }
            setRole("user", "u-alex");
            toast.success("Signed in (demo)");
            nav("/app/today");
          }}
          className="mt-6 space-y-3 rounded-xl bg-card p-5 text-card-foreground"
        >
          <div>
            <Label htmlFor="e">Email</Label>
            <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="touch-target" />
          </div>
          <div>
            <Label htmlFor="p">Password</Label>
            <Input id="p" type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="touch-target" />
          </div>
          <Button type="submit" className="touch-target w-full">Sign in</Button>
        </form>
      </div>
    </div>
  );
}
