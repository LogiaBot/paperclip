import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { AgentTokenUsage } from "@paperclipai/shared";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Identity } from "../Identity";
import { PageSkeleton } from "../PageSkeleton";
import { StatusBadge } from "../StatusBadge";
import { cn, formatNumber, formatTokens, relativeTime } from "../../lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SortKey = "agent" | "total" | "input" | "cached" | "output" | "runs";
type SortDir = "asc" | "desc";

function trackingLabel(row: AgentTokenUsage): string {
  if (row.totalTokens > 0) return "Tracked";
  if (row.runCountInRange === 0) return "No runs";
  if (row.runsWithTokensInRange === 0) return "Runs, no usage";
  return "Tracked";
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {label}
      {active ? (
        dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <span className="h-3 w-3" />
      )}
    </button>
  );
}

function formatTokenCell(value: number): string {
  return formatTokens(value);
}

export function TokensTab({
  rows,
  isLoading,
  error,
  showCustomPrompt,
}: {
  rows: AgentTokenUsage[] | undefined;
  isLoading: boolean;
  error: Error | null;
  showCustomPrompt: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedRows = useMemo(() => {
    const sorted = [...(rows ?? [])];
    const dir = sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "agent":
          return dir * a.agentName.localeCompare(b.agentName);
        case "input":
          return dir * (a.inputTokens - b.inputTokens);
        case "cached":
          return dir * (a.cachedInputTokens - b.cachedInputTokens);
        case "output":
          return dir * (a.outputTokens - b.outputTokens);
        case "runs":
          return dir * (a.runCountInRange - b.runCountInRange);
        case "total":
        default:
          return dir * (a.totalTokens - b.totalTokens);
      }
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  const totals = useMemo(() => {
    return (rows ?? []).reduce(
      (acc, row) => ({
        inputTokens: acc.inputTokens + row.inputTokens,
        cachedInputTokens: acc.cachedInputTokens + row.cachedInputTokens,
        outputTokens: acc.outputTokens + row.outputTokens,
        totalTokens: acc.totalTokens + row.totalTokens,
        agentsWithUsage: acc.agentsWithUsage + (row.totalTokens > 0 ? 1 : 0),
        runCount: acc.runCount + row.runCountInRange,
      }),
      {
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        agentsWithUsage: 0,
        runCount: 0,
      },
    );
  }, [rows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "agent" ? "asc" : "desc");
  };

  if (showCustomPrompt) {
    return <p className="text-sm text-muted-foreground">Select a start and end date to load token usage.</p>;
  }

  if (isLoading) {
    return <PageSkeleton variant="costs" />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border border-border p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Total tokens</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{formatTokens(totals.totalTokens)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatNumber(totals.totalTokens)} raw · {totals.agentsWithUsage} of {rows?.length ?? 0} agents with usage
          </div>
        </div>
        <div className="border border-border p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Input</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{formatTokens(totals.inputTokens)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatNumber(totals.inputTokens)} tokens</div>
        </div>
        <div className="border border-border p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Cached input</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{formatTokens(totals.cachedInputTokens)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatNumber(totals.cachedInputTokens)} tokens</div>
        </div>
        <div className="border border-border p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Output</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{formatTokens(totals.outputTokens)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatNumber(totals.outputTokens)} tokens</div>
        </div>
      </div>

      <Card>
        <CardHeader className="px-5 pt-5 pb-2">
          <CardTitle className="text-base">Agent token usage</CardTitle>
          <CardDescription>
            Tokens from Paperclip heartbeat runs in the selected period. Agents with runs but no usage usually mean the
            adapter did not report token counts (common with Hermes quiet mode).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-2">
          {(rows?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No agents in this company yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left">
                      <SortHeader label="Agent" active={sortKey === "agent"} dir={sortDir} onClick={() => toggleSort("agent")} />
                    </th>
                    <th className="py-2 pr-4 text-left">
                      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Status</span>
                    </th>
                    <th className="py-2 pr-4 text-right">
                      <SortHeader
                        label="Total"
                        active={sortKey === "total"}
                        dir={sortDir}
                        onClick={() => toggleSort("total")}
                        className="w-full justify-end"
                      />
                    </th>
                    <th className="py-2 pr-4 text-right">
                      <SortHeader
                        label="Input"
                        active={sortKey === "input"}
                        dir={sortDir}
                        onClick={() => toggleSort("input")}
                        className="w-full justify-end"
                      />
                    </th>
                    <th className="py-2 pr-4 text-right">
                      <SortHeader
                        label="Cached"
                        active={sortKey === "cached"}
                        dir={sortDir}
                        onClick={() => toggleSort("cached")}
                        className="w-full justify-end"
                      />
                    </th>
                    <th className="py-2 pr-4 text-right">
                      <SortHeader
                        label="Output"
                        active={sortKey === "output"}
                        dir={sortDir}
                        onClick={() => toggleSort("output")}
                        className="w-full justify-end"
                      />
                    </th>
                    <th className="py-2 pr-4 text-right">
                      <SortHeader
                        label="Runs"
                        active={sortKey === "runs"}
                        dir={sortDir}
                        onClick={() => toggleSort("runs")}
                        className="w-full justify-end"
                      />
                    </th>
                    <th className="py-2 text-right">
                      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Last run</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr key={row.agentId} className="border-b border-border/60 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <Link to={`/agents/${row.agentId}`} className="min-w-0 hover:underline">
                            <Identity name={row.agentName} size="sm" />
                          </Link>
                          {row.agentStatus === "terminated" ? <StatusBadge status="terminated" /> : null}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {trackingLabel(row)}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium tabular-nums">
                        {formatTokenCell(row.totalTokens)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                        {formatTokenCell(row.inputTokens)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                        {formatTokenCell(row.cachedInputTokens)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                        {formatTokenCell(row.outputTokens)}
                      </td>
                      <td className="py-3 pr-4 text-right text-xs tabular-nums text-muted-foreground">
                        {row.runCountInRange > 0 ? (
                          <>
                            {row.runCountInRange}
                            {row.runsWithTokensInRange > 0 ? (
                              <span className="text-muted-foreground/80"> · {row.runsWithTokensInRange} w/ tokens</span>
                            ) : null}
                          </>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="py-3 text-right text-xs tabular-nums text-muted-foreground">
                        {row.lastRunAt ? relativeTime(row.lastRunAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
