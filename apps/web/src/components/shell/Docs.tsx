import { Check, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { Surface } from "@/components/app/Surface";
import { cn } from "@/lib/utils";

/** Page header for every docs section. */
export const SectionIntro = ({
  index,
  kicker,
  title,
  lede,
  meta,
}: {
  index: string;
  kicker: string;
  title: string;
  lede: ReactNode;
  meta?: ReactNode;
}) => (
  <header className="border-b border-border pb-8">
    <div className="flex items-center gap-3">
      <span className="tabular flex size-8 items-center justify-center rounded-full bg-primary/12 text-label font-extrabold text-primary">
        {index}
      </span>
      <span className="text-eyebrow font-bold uppercase text-muted-foreground">{kicker}</span>
    </div>
    <h1 className="mt-4 text-display font-extrabold tracking-[-0.03em] text-foreground">{title}</h1>
    <p className="mt-3 max-w-2xl text-subhead leading-[27px] text-muted-foreground">{lede}</p>
    {meta ? <div className="mt-5 flex flex-wrap gap-2">{meta}</div> : null}
  </header>
);

export const Pill = ({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "brand" | "admin" }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-caption font-semibold",
      tone === "muted" && "bg-muted text-muted-foreground",
      tone === "brand" && "bg-primary/10 text-primary",
      tone === "admin" && "bg-admin-surface text-admin-ink",
    )}
  >
    {children}
  </span>
);

export const Block = ({
  id,
  eyebrow,
  title,
  description,
  lede,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Alias for `description`, used by the section pages. */
  lede?: ReactNode;
  children?: ReactNode;
  className?: string;
}) => (
  <section id={id} className={cn("scroll-mt-24", className)}>
    {eyebrow ? (
      <p className="text-eyebrow font-bold uppercase text-muted-foreground">{eyebrow}</p>
    ) : null}
    <h2 className="mt-1 text-title font-bold tracking-[-0.02em] text-foreground">{title}</h2>
    {description ?? lede ? (
      <p className="mt-2 max-w-3xl text-body leading-[23px] text-muted-foreground">
        {description ?? lede}
      </p>
    ) : null}
    {children ? <div className="mt-6">{children}</div> : null}
  </section>
);

export const Card = ({
  title,
  note,
  children,
  className,
}: {
  title?: string;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <Surface className={cn("p-5", className)}>
    {title ? <h3 className="text-subhead font-bold text-foreground">{title}</h3> : null}
    {note ? <p className="mt-1.5 text-label leading-[20px] text-muted-foreground">{note}</p> : null}
    <div className={cn(title || note ? "mt-4" : "")}>{children}</div>
  </Surface>
);

export const Bullets = ({ items, tone = "default" }: { items: ReactNode[]; tone?: "default" | "compact" }) => (
  <ul className={cn("space-y-2.5", tone === "compact" && "space-y-1.5")}>
    {items.map((item, index) => (
      <li key={index} className="flex items-start gap-2.5">
        <Check className="mt-[3px] size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="text-label leading-[20px] text-muted-foreground">{item}</span>
      </li>
    ))}
  </ul>
);

export const DoDont = ({
  dos,
  donts,
}: {
  dos: ReactNode[];
  donts: ReactNode[];
}) => (
  <div className="grid gap-4 sm:grid-cols-2">
    <Surface className="border-status-approved/25 bg-status-approved-soft/50 p-5">
      <p className="flex items-center gap-2 text-label font-extrabold uppercase text-status-approved-foreground">
        <Check className="size-4" aria-hidden="true" />
        Do
      </p>
      <ul className="mt-3 space-y-2">
        {dos.map((item, index) => (
          <li key={index} className="text-label leading-[20px] text-status-approved-foreground">
            {item}
          </li>
        ))}
      </ul>
    </Surface>
    <Surface className="border-status-rejected/25 bg-status-rejected-soft/50 p-5">
      <p className="flex items-center gap-2 text-label font-extrabold uppercase text-status-rejected-foreground">
        <Minus className="size-4" aria-hidden="true" />
        Don't
      </p>
      <ul className="mt-3 space-y-2">
        {donts.map((item, index) => (
          <li key={index} className="text-label leading-[20px] text-status-rejected-foreground">
            {item}
          </li>
        ))}
      </ul>
    </Surface>
  </div>
);

export const KeyValue = ({ rows }: { rows: [string, ReactNode][] }) => (
  <dl className="divide-y divide-border/70">
    {rows.map(([key, value]) => (
      <div key={key} className="flex items-start justify-between gap-6 py-2.5">
        <dt className="font-mono text-caption text-muted-foreground">{key}</dt>
        <dd className="max-w-[60%] text-right text-caption font-semibold text-foreground">{value}</dd>
      </div>
    ))}
  </dl>
);

export const SpecTable = ({
  head,
  rows,
}: {
  head: string[];
  rows: ReactNode[][];
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[560px] border-collapse text-left">
      <thead>
        <tr>
          {head.map((cell) => (
            <th
              key={cell}
              className="border-b border-border pb-2.5 text-eyebrow font-bold uppercase text-muted-foreground"
            >
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-b border-border/60 align-top">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="py-3 pr-4 text-label leading-[20px] text-muted-foreground">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
