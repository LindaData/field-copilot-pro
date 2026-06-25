import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceBadge } from "@/components/SourceBadge";
import { ExternalLink, FileText, Send } from "lucide-react";
import { goodmanPdfSource } from "@/lib/seed";

export default function DocumentViewer() {
  const { id = "" } = useParams();
  const { state } = useStore();
  const doc = state.docs.find((d) => d.id === id);
  const [q, setQ] = useState("");
  const [a, setA] = useState<null | { text: string; ref: string }>(null);

  if (!doc) return <div className="p-6">Not found</div>;
  const ask = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes("mca")) setA({ text: "Minimum circuit ampacity: 11.2 A.", ref: "Product Specifications, p.3 — Electrical" });
    else if (t.includes("voltage")) setA({ text: "Min / max voltage: 197 V / 253 V.", ref: "Product Specifications, p.3 — Electrical" });
    else if (t.includes("charge")) setA({ text: "Refrigerant factory charge: 71 oz (15 ft of 3/8\" liquid line).", ref: "Product Specifications, p.3 — Refrigeration" });
    else setA({ text: "Not found in current documents. Try MCA, voltage range, or refrigerant charge.", ref: "—" });
  };

  return (
    <div className="p-4">
      <div className="card-elev p-4">
        <div className="text-xs text-muted-foreground">{doc.category.replace("_", " ")}</div>
        <h1 className="text-base font-semibold">{doc.title}</h1>
        {doc.url && doc.url !== "#" && (
          <a href={doc.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-info underline">
            Open source <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <Tabs defaultValue="preview" className="mt-4">
        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="ask">Ask</TabsTrigger></TabsList>
        <TabsContent value="preview" className="card-elev mt-3 p-4">
          <div className="flex aspect-[4/5] items-center justify-center rounded-md bg-muted text-center text-xs text-muted-foreground">
            <div className="space-y-2">
              <FileText className="mx-auto h-10 w-10" />
              <div>Document preview placeholder.</div>
              {doc.url && doc.url !== "#" && <a className="underline" href={doc.url} target="_blank" rel="noreferrer">Open the original</a>}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" className="flex-1" disabled>Save to equipment</Button>
            <Button variant="outline" className="flex-1" disabled>Flag conflict</Button>
            <Button variant="outline" className="flex-1" disabled>Request review</Button>
          </div>
        </TabsContent>
        <TabsContent value="ask" className="card-elev mt-3 p-4">
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask this document…" className="touch-target" />
            <Button type="submit" size="icon" className="touch-target"><Send className="h-5 w-5" /></Button>
          </form>
          {a && (
            <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{a.text}</div>
              <div className="mt-1 text-xs text-muted-foreground">{a.ref}</div>
              <div className="mt-2"><SourceBadge source={goodmanPdfSource} compact /></div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-4 text-center"><Link className="text-sm underline" to="/app/documents">← Back to documents</Link></div>
    </div>
  );
}
