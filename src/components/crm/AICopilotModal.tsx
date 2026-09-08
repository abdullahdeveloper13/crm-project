import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Bot, Sparkles, Copy, Check, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AICopilotProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "email" | "deal" | "meeting" | "lead";
  contextData?: {
    contactName?: string;
    companyName?: string;
    dealTitle?: string;
    dealValue?: number;
    stage?: string;
  };
};

export function AICopilotModal({
  isOpen,
  onClose,
  defaultMode = "email",
  contextData,
}: AICopilotProps) {
  const [mode, setMode] = useState<"email" | "deal" | "meeting" | "lead">(defaultMode);
  const [promptInput, setPromptInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState("");
  const [copied, setCopied] = useState(false);

  const contactName = contextData?.contactName || "Prospect";
  const companyName = contextData?.companyName || "Acme Corp";
  const dealTitle = contextData?.dealTitle || "Enterprise Expansion";
  const dealValue = contextData?.dealValue
    ? `$${contextData.dealValue.toLocaleString()}`
    : "$25,000";

  function handleGenerate() {
    setGenerating(true);
    setCopied(false);

    setTimeout(() => {
      let output = "";
      if (mode === "email") {
        output = `Subject: Accelerating revenue operations for ${companyName}

Hi ${contactName},

I noticed ${companyName}'s recent momentum and wanted to share how NovaCRM AI has helped similar sales teams increase pipeline velocity by 34%.

Based on your current priorities, our AI copilots automate repetitive follow-ups and surface high-intent buyer signals before deals stall.

Would you be open to a 10-minute introductory conversation next Tuesday at 2:00 PM EST to see a live workflow tailored for ${companyName}?

Best regards,
Your Sales Team`;
      } else if (mode === "deal") {
        output = `### Deal Strategy & Closing Accelerators: ${dealTitle}
* **Target Value:** ${dealValue}
* **Current Status:** In Evaluation

#### Recommended Next Actions:
1. **Multi-Thread Stakeholders:** Identify and engage the CFO/Financial sponsor to validate budget clearance early.
2. **Mutual Action Plan (MAP):** Send a shared timeline specifying security review milestones and go-live expectations.
3. **Executive Sponsor Alignment:** Arrange a brief 15-minute peer-to-peer sync with our VP of Sales.
4. **Value Metric Validation:** Reiterate estimated ROI and payback timeline in all follow-up correspondence.`;
      } else if (mode === "meeting") {
        output = `### Meeting Summary & Action Items
* **Participants:** Team & ${contactName} (${companyName})
* **Key Topics Discussed:** Integration timelines, team seats requirement, and procurement process.

#### Action Items:
- [ ] **Sales Rep:** Send updated proposal with multi-year tier discount by EOD tomorrow.
- [ ] **Customer Champion:** Share standard security assessment questionnaire.
- [ ] **Solutions Engineer:** Prepare SSO & Supabase sync architecture diagram.
- [ ] **Follow-up Sync:** Target next Thursday at 3:00 PM EST.`;
      } else {
        output = `### Lead Qualification Analysis (BANT Framework)
* **Lead:** ${contactName} | **Account:** ${companyName}
* **Qualification Score:** 88 / 100 (High Intent)

* **Budget (8/10):** Validated active software consolidation budget for current fiscal quarter.
* **Authority (9/10):** Primary decision-maker in revenue operations.
* **Need (9/10):** Urgent requirement to streamline manual sales workflows.
* **Timeline (9/10):** Target decision within next 30 days.

**Recommendation:** Fast-track to product demo and proposal stage.`;
      }

      setGeneratedResult(output);
      setGenerating(false);
      toast.success("AI Copilot generated output");
    }, 600);
  }

  function handleCopy() {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] min-h-0 max-w-2xl flex-col gap-0 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0 pb-4 pr-8">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white shadow-elevated">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Nova AI Sales Copilot</DialogTitle>
              <DialogDescription>
                AI-driven deal acceleration, email drafting, and sales intelligence.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "email", label: "Draft Outreach Email" },
              { id: "deal", label: "Deal Closing Strategy" },
              { id: "meeting", label: "Meeting Summary" },
              { id: "lead", label: "Lead Qualification Score" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setMode(tab.id as typeof mode);
                  setGeneratedResult("");
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mode === tab.id
                    ? "bg-brand text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Active Context:</span> Contact:{" "}
            {contactName} | Company: {companyName} | Deal: {dealTitle}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Custom instructions or additional notes (optional)
            </label>
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g. emphasize SOC2 compliance, keep tone concise, mention Q1 promo..."
              rows={2}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-elevated hover:opacity-95 disabled:opacity-60"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "Synthesizing..." : "Generate with Nova AI"}
            </button>
          </div>

          {generatedResult && (
            <div className="mt-4 min-w-0 rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  AI Generated Output
                </span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Copy to clipboard"}
                </button>
              </div>
              <pre className="max-w-full whitespace-pre-wrap break-words text-sm font-sans leading-relaxed text-foreground">
                {generatedResult}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
