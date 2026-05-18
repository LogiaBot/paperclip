import type { Issue } from "@paperclipai/shared";

export type IssueFilterWorkspaceLookup = {
  mode?: string | null;
  projectWorkspaceId?: string | null;
};

export type IssueFilterWorkspaceContext = {
  executionWorkspaceById?: ReadonlyMap<string, IssueFilterWorkspaceLookup>;
  defaultProjectWorkspaceIdByProjectId?: ReadonlyMap<string, string>;
};

export type DateFilterPreset = "today" | "last7" | "last30" | "thisMonth" | "thisQuarter" | "custom";
export type DateFilterField = "createdAt" | "updatedAt";

export type IssueFilterState = {
  statuses: string[];
  priorities: string[];
  assignees: string[];
  creators: string[];
  labels: string[];
  projects: string[];
  workspaces: string[];
  liveOnly?: boolean;
  hideRoutineExecutions: boolean;
  datePreset?: DateFilterPreset | null;
  dateField?: DateFilterField;
  dateAfter?: string | null;
  dateBefore?: string | null;
};

export const defaultIssueFilterState: IssueFilterState = {
  statuses: [],
  priorities: [],
  assignees: [],
  creators: [],
  labels: [],
  projects: [],
  workspaces: [],
  liveOnly: false,
  hideRoutineExecutions: false,
  datePreset: null,
  dateField: "createdAt",
  dateAfter: null,
  dateBefore: null,
};

export const dateFilterPresets: { key: DateFilterPreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "thisMonth", label: "This month" },
  { key: "thisQuarter", label: "This quarter" },
  { key: "custom", label: "Custom" },
];

export function computeDateRange(preset: DateFilterPreset): { after: string; before: string | null } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { after: startOfDay.toISOString(), before: null };
    case "last7": {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - 7);
      return { after: d.toISOString(), before: null };
    }
    case "last30": {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - 30);
      return { after: d.toISOString(), before: null };
    }
    case "thisMonth":
      return { after: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), before: null };
    case "thisQuarter": {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      return { after: new Date(now.getFullYear(), quarterStart, 1).toISOString(), before: null };
    }
    case "custom":
      return { after: "", before: null };
  }
}

export const issueStatusOrder = ["in_progress", "todo", "backlog", "in_review", "blocked", "done", "cancelled"];
export const issuePriorityOrder = ["critical", "high", "medium", "low"];

export const issueQuickFilterPresets = [
  { label: "All", statuses: [] as string[] },
  { label: "Active", statuses: ["todo", "in_progress", "in_review", "blocked"] },
  { label: "Backlog", statuses: ["backlog"] },
  { label: "Done", statuses: ["done", "cancelled"] },
];

export function issueFilterLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function issueFilterArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function normalizeIssueFilterValueArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeDateFilterPreset(value: unknown): DateFilterPreset | null {
  if (value === "today" || value === "last7" || value === "last30" || value === "thisMonth" || value === "thisQuarter" || value === "custom") return value;
  return null;
}

function normalizeDateFilterField(value: unknown): DateFilterField {
  return value === "updatedAt" ? "updatedAt" : "createdAt";
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function normalizeIssueFilterState(value: unknown): IssueFilterState {
  if (!value || typeof value !== "object") return { ...defaultIssueFilterState };
  const candidate = value as Partial<Record<keyof IssueFilterState, unknown>>;
  return {
    statuses: normalizeIssueFilterValueArray(candidate.statuses),
    priorities: normalizeIssueFilterValueArray(candidate.priorities),
    assignees: normalizeIssueFilterValueArray(candidate.assignees),
    creators: normalizeIssueFilterValueArray(candidate.creators),
    labels: normalizeIssueFilterValueArray(candidate.labels),
    projects: normalizeIssueFilterValueArray(candidate.projects),
    workspaces: normalizeIssueFilterValueArray(candidate.workspaces),
    liveOnly: candidate.liveOnly === true,
    hideRoutineExecutions: candidate.hideRoutineExecutions === true,
    datePreset: normalizeDateFilterPreset(candidate.datePreset),
    dateField: normalizeDateFilterField(candidate.dateField),
    dateAfter: normalizeOptionalString(candidate.dateAfter),
    dateBefore: normalizeOptionalString(candidate.dateBefore),
  };
}

export function toggleIssueFilterValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((existing) => existing !== value) : [...values, value];
}

export function resolveIssueFilterWorkspaceId(
  issue: Pick<Issue, "executionWorkspaceId" | "projectId" | "projectWorkspaceId">,
  context: IssueFilterWorkspaceContext = {},
): string | null {
  const defaultProjectWorkspaceId = issue.projectId
    ? context.defaultProjectWorkspaceIdByProjectId?.get(issue.projectId) ?? null
    : null;

  if (issue.executionWorkspaceId) {
    const executionWorkspace = context.executionWorkspaceById?.get(issue.executionWorkspaceId) ?? null;
    const linkedProjectWorkspaceId =
      executionWorkspace?.projectWorkspaceId ?? issue.projectWorkspaceId ?? null;
    const isDefaultSharedExecutionWorkspace =
      executionWorkspace?.mode === "shared_workspace"
      && linkedProjectWorkspaceId != null
      && linkedProjectWorkspaceId === defaultProjectWorkspaceId;
    if (isDefaultSharedExecutionWorkspace) return null;
    return issue.executionWorkspaceId;
  }

  if (issue.projectWorkspaceId) {
    if (issue.projectWorkspaceId === defaultProjectWorkspaceId) return null;
    return issue.projectWorkspaceId;
  }

  return null;
}

export function shouldIncludeIssueFilterWorkspaceOption(
  workspace: { id: string; mode?: string | null; projectWorkspaceId?: string | null },
  defaultProjectWorkspaceIds: ReadonlySet<string>,
): boolean {
  if (defaultProjectWorkspaceIds.has(workspace.id)) return false;
  return !(workspace.mode === "shared_workspace"
    && workspace.projectWorkspaceId != null
    && defaultProjectWorkspaceIds.has(workspace.projectWorkspaceId));
}

export function resolveDateFilterRange(state: IssueFilterState): { after: string | null; before: string | null } {
  if (!state.datePreset) return { after: null, before: null };
  if (state.datePreset === "custom") return { after: state.dateAfter ?? null, before: state.dateBefore ?? null };
  const range = computeDateRange(state.datePreset);
  return { after: range.after || null, before: range.before };
}

export function hasActiveDateFilter(state: IssueFilterState): boolean {
  if (!state.datePreset) return false;
  if (state.datePreset === "custom") return !!(state.dateAfter || state.dateBefore);
  return true;
}

export function applyIssueFilters(
  issues: Issue[],
  state: IssueFilterState,
  currentUserId?: string | null,
  enableRoutineVisibilityFilter = false,
  liveIssueIds?: ReadonlySet<string>,
  workspaceContext: IssueFilterWorkspaceContext = {},
): Issue[] {
  let result = issues;
  if (state.liveOnly) {
    result = result.filter((issue) => liveIssueIds?.has(issue.id) === true);
  }
  if (enableRoutineVisibilityFilter && state.hideRoutineExecutions) {
    result = result.filter((issue) => issue.originKind !== "routine_execution");
  }
  if (state.statuses.length > 0) result = result.filter((issue) => state.statuses.includes(issue.status));
  if (state.priorities.length > 0) result = result.filter((issue) => state.priorities.includes(issue.priority));
  if (state.assignees.length > 0) {
    result = result.filter((issue) => {
      for (const assignee of state.assignees) {
        if (assignee === "__unassigned" && !issue.assigneeAgentId && !issue.assigneeUserId) return true;
        if (assignee === "__me" && currentUserId && issue.assigneeUserId === currentUserId) return true;
        if (issue.assigneeAgentId === assignee) return true;
      }
      return false;
    });
  }
  if (state.creators.length > 0) {
    result = result.filter((issue) => {
      for (const creator of state.creators) {
        if (creator.startsWith("agent:") && issue.createdByAgentId === creator.slice("agent:".length)) return true;
        if (creator.startsWith("user:") && issue.createdByUserId === creator.slice("user:".length)) return true;
      }
      return false;
    });
  }
  if (state.labels.length > 0) {
    result = result.filter((issue) => (issue.labelIds ?? []).some((id) => state.labels.includes(id)));
  }
  if (state.projects.length > 0) {
    result = result.filter((issue) => issue.projectId != null && state.projects.includes(issue.projectId));
  }
  if (state.workspaces.length > 0) {
    result = result.filter((issue) => {
      const workspaceId = resolveIssueFilterWorkspaceId(issue, workspaceContext);
      return workspaceId != null && state.workspaces.includes(workspaceId);
    });
  }
  if (hasActiveDateFilter(state)) {
    const { after, before } = resolveDateFilterRange(state);
    const field = state.dateField === "updatedAt" ? "updatedAt" : "createdAt";
    if (after) {
      const afterTime = new Date(after).getTime();
      result = result.filter((issue) => {
        const ts = issue[field];
        return ts != null && new Date(ts).getTime() >= afterTime;
      });
    }
    if (before) {
      const beforeTime = new Date(before).getTime();
      result = result.filter((issue) => {
        const ts = issue[field];
        return ts != null && new Date(ts).getTime() <= beforeTime;
      });
    }
  }
  return result;
}

export function countActiveIssueFilters(
  state: IssueFilterState,
  enableRoutineVisibilityFilter = false,
): number {
  let count = 0;
  if (state.statuses.length > 0) count += 1;
  if (state.priorities.length > 0) count += 1;
  if (state.assignees.length > 0) count += 1;
  if (state.creators.length > 0) count += 1;
  if (state.labels.length > 0) count += 1;
  if (state.projects.length > 0) count += 1;
  if (state.workspaces.length > 0) count += 1;
  if (state.liveOnly) count += 1;
  if (enableRoutineVisibilityFilter && state.hideRoutineExecutions) count += 1;
  if (hasActiveDateFilter(state)) count += 1;
  return count;
}
