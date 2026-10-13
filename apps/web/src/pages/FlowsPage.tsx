import { ArrowLeft, ArrowRight, Hand, Link2, RotateCcw } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { PhoneButton } from "@/components/app/PhoneButton";
import { Chip, ChipRow } from "@/components/app/Chip";
import { Surface } from "@/components/app/Surface";
import { Block, Bullets, Card, Pill, SectionIntro } from "@/components/shell/Docs";
import { cn } from "@/lib/utils";
import { FLOWS, clampStep, flowById, scriptFor } from "@/prototype/flows";
import { PhoneShell } from "@/prototype/PhoneShell";

export const FlowsPage = () => {
  const [params, setParams] = useSearchParams();
  const flow = flowById(params.get("flow") ?? FLOWS[0].id);
  const raw = Number(params.get("step") ?? "0");
  const step = clampStep(flow, Number.isFinite(raw) ? raw : 0);
  const script = scriptFor(flow, step);

  const update = (flowId: string, nextStep: number) =>
    setParams({ flow: flowId, step: String(clampStep(flowById(flowId), nextStep)) });

  const current = flow.steps[step];

  return (
    <>
      <SectionIntro
        index="09"
        kicker="Deliverable nine"
        title="Clickable prototype flows"
        lede="Seven journeys, each scripted as a sequence of state changes and replayed into a live frame. Use Next to walk a flow, or tap the phone at any point — the scripts only set up the state, they never block you."
        meta={
          <>
            <Pill tone="brand">7 flows</Pill>
            <Pill>Deep-linkable steps</Pill>
            <Pill>Frames remount per step</Pill>
          </>
        }
      />

      <Block eyebrow="Pick a journey" title="The seven flows" lede="Each flow starts from a clean frame so the steps are repeatable.">
        <ChipRow className="mx-0 px-0">
          {FLOWS.map((item) => (
            <Chip
              key={item.id}
              selected={item.id === flow.id}
              icon={<Link2 className="size-4" aria-hidden="true" />}
              onClick={() => update(item.id, 0)}
            >
              {item.title}
            </Chip>
          ))}
        </ChipRow>
      </Block>

      <div className="grid gap-10 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-8 xl:self-start">
          <PhoneShell
            key={`${flow.id}-${step}`}
            role={flow.start.role ?? "student"}
            initial={flow.start}
            script={script}
            caption={`${flow.title} · step ${step + 1} of ${flow.steps.length}`}
          />
          <div className="mt-5 flex items-center gap-2.5">
            <PhoneButton
              variant="outline"
              disabled={step === 0}
              onClick={() => update(flow.id, step - 1)}
              className="flex-1"
            >
              <ArrowLeft />
              Back
            </PhoneButton>
            <PhoneButton
              disabled={step >= flow.steps.length - 1}
              onClick={() => update(flow.id, step + 1)}
              className="flex-1"
            >
              Next
              <ArrowRight />
            </PhoneButton>
            <PhoneButton
              variant="ghost"
              size="icon"
              aria-label="Restart flow"
              onClick={() => update(flow.id, 0)}
            >
              <RotateCcw />
            </PhoneButton>
          </div>
        </div>

        <div className="min-w-0">
          <Surface className="p-5">
            <p className="text-eyebrow font-bold uppercase text-muted-foreground">Flow</p>
            <h2 className="mt-1 text-title font-bold text-foreground">{flow.title}</h2>
            <p className="mt-2 text-body leading-[23px] text-muted-foreground">{flow.summary}</p>
          </Surface>

          <ol className="mt-6 space-y-2.5">
            {flow.steps.map((flowStep, index) => {
              const active = index === step;
              const done = index < step;
              return (
                <li key={flowStep.label}>
                  <button
                    type="button"
                    onClick={() => update(flow.id, index)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex w-full gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ease-smooth",
                      active
                        ? "border-primary bg-primary/8 shadow-tile"
                        : "border-border bg-card hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "tabular mt-[1px] flex size-7 shrink-0 items-center justify-center rounded-full text-caption font-extrabold",
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-label font-bold text-foreground">{flowStep.label}</span>
                        {flowStep.manual ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-status-pending-soft px-2 py-[2px] text-caption font-semibold text-status-pending-foreground">
                            <Hand className="size-3" aria-hidden="true" />
                            Tap in the frame
                          </span>
                        ) : null}
                        {flowStep.actions.length === 0 && !flowStep.manual ? (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-[2px] text-caption font-semibold text-muted-foreground">
                            Look
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-caption leading-[18px] text-muted-foreground">
                        {flowStep.detail}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <Surface className="mt-6 p-5">
            <p className="text-eyebrow font-bold uppercase text-muted-foreground">Current step</p>
            <p className="mt-1 text-subhead font-bold text-foreground">
              {step + 1}. {current.label}
            </p>
            <p className="mt-2 text-label leading-[21px] text-muted-foreground">{current.detail}</p>
            <div className="mt-4">
              <p className="text-eyebrow font-bold uppercase text-muted-foreground">
                Dispatched to reach this step
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {script.slice(-4).map((action, index) => (
                  <code
                    key={`${action.type}-${index}`}
                    className="rounded-lg border border-border/70 bg-muted px-2 py-1 font-mono text-caption text-muted-foreground"
                  >
                    {action.type}
                  </code>
                ))}
                {script.length === 0 ? (
                  <span className="text-caption text-muted-foreground">Fresh frame — no actions yet.</span>
                ) : null}
              </div>
            </div>
            <p className="mt-4 font-mono text-caption text-muted-foreground">
              /flows?flow={flow.id}&amp;step={step}
            </p>
          </Surface>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Card title="How to read a flow" note="The rail is the script; the phone is the truth.">
              <Bullets
                tone="compact"
                items={[
                  "Next replays every action from step 1, so a step always looks the same.",
                  "Manual steps need a tap inside the frame — local UI state a script cannot reach.",
                  "Look steps are pure observation, no state change.",
                ]}
              />
            </Card>
            <Card title="Deep links" note="Every step is addressable, which is also how this page was verified.">
              <Bullets
                tone="compact"
                items={[
                  "/flows?flow=upload&step=3",
                  "/flows?flow=admin-review&step=5",
                  "/flows?flow=report&step=7",
                  "/flows?flow=deadline&step=2",
                ]}
              />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default FlowsPage;
