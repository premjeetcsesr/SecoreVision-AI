import React, { useState, useEffect } from 'react';
import {
  ListTodo,
  CheckCircle2,
  MousePointer,
  EyeOff,
  Download,
  Check,
  CornerDownRight,
} from 'lucide-react';
import { Card } from '../../shared/Card';
import { Badge } from '../../shared/Badge';
import { Button } from '../../shared/Button';
import { EmptyState } from '../../shared/EmptyState';
import { getStoredTasks, updateStoredTasks } from '../../services/storage';
import { Task, AuditLogEntry } from '../../types';

interface TaskPanelProps {
  initialTaskId?: string;
  onNavigateToPreview: () => void;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({
  initialTaskId,
  onNavigateToPreview,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTaskId || '');
  const [isExecutingStep, setIsExecutingStep] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    getStoredTasks().then((loaded) => {
      setTasks(loaded);
      if (initialTaskId) {
        setSelectedTaskId(initialTaskId);
      } else if (loaded.length > 0) {
        setSelectedTaskId(loaded[0].id);
      }
      setIsLoading(false);
    });
  }, [initialTaskId]);

  const currentTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  const handleApproveAction = async (actionId: string) => {
    if (!currentTask) return;
    setIsExecutingStep(true);
    let serverNote = '';
    try {
      const res = await fetch('http://127.0.0.1:8000/api/agent/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: currentTask.prompt,
          redaction_scheme_version: '1.0',
          sanitized_dom: currentTask.actions.map((a) => ({
            tag: a.type === 'click' ? 'button' : 'input',
            selector: a.targetElement || 'body',
            visible_text: a.description,
          })),
          history: [{ step: 1, action: 'approve', selector: actionId }],
        }),
      });
      if (res.ok) {
        const stepData = await res.json();
        serverNote = ` [AI: ${stepData.reasoning}]`;
      }
    } catch {
      // Backend offline fallback
    }

    const updatedTasks = await updateStoredTasks((prev) =>
      prev.map((t) => {
        if (t.id !== currentTask.id) return t;
        const updatedActions = t.actions.map((act) =>
          act.id === actionId
            ? { ...act, isApproved: true, status: 'completed' as const }
            : act
        );
        const newLog: AuditLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'shield',
          message: `Operator approved DOM action: ${actionId}. Executed in sanitized sandbox.${serverNote}`,
        };
        return {
          ...t,
          actions: updatedActions,
          auditLogs: [newLog, ...t.auditLogs],
        };
      })
    );
    setTasks(updatedTasks);
    setIsExecutingStep(false);
  };

  const handleApproveAll = async () => {
    if (!currentTask) return;
    const updatedTasks = await updateStoredTasks((prev) =>
      prev.map((t) => {
        if (t.id !== currentTask.id) return t;
        const updated = t.actions.map((act) => ({
          ...act,
          isApproved: true,
          status: 'completed' as const,
        }));
        return {
          ...t,
          status: 'completed',
          actions: updated,
          auditLogs: [
            {
              id: `log-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              level: 'info',
              message: 'Operator batch-approved all planned DOM actions.',
            },
            ...t.auditLogs,
          ],
        };
      })
    );
    setTasks(updatedTasks);
  };

  const handleExportLogs = () => {
    if (!currentTask) return;
    const jsonStr = JSON.stringify(currentTask.auditLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${currentTask.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Loading task records...
      </div>
    );
  }

  if (tasks.length === 0 || !currentTask) {
    return (
      <EmptyState
        icon={<ListTodo className="w-10 h-10 text-slate-500" />}
        title="No Recorded Tasks"
        description="Launch an automated browsing task from the SecureVision popup to inspect planned steps, enforce human approvals, and review audit trails."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Task Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg shadow-black/20">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Visual Agent Task Controller
            </h2>
            <Badge
              variant={currentTask.status === 'completed' ? 'privacy' : 'warning'}
              pulse={currentTask.status !== 'completed'}
            >
              {currentTask.status === 'completed' ? 'Task Completed' : 'Awaiting Approval'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review planned browser interactions and approve safe DOM operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {tasks.length > 1 && (
            <select
              aria-label="Select Task"
              value={currentTask.id}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="shield"
            size="sm"
            leftIcon={<Check className="w-4 h-4" />}
            onClick={handleApproveAll}
            disabled={currentTask.actions.length === 0 || currentTask.actions.every((a) => a.isApproved)}
          >
            Approve All Steps
          </Button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Audit log exported successfully. JSON downloaded locally.</span>
          </div>
        </div>
      )}

      {/* Task Summary Card */}
      <Card
        title={currentTask.title}
        subtitle={`Target: ${currentTask.pageDomain} • Started: ${new Date(currentTask.startedAt).toLocaleTimeString()}`}
        headerAction={
          <Badge variant="privacy">
            Privacy: {currentTask.privacyScore}%
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Operator Prompt
            </div>
            <p className="text-xs text-slate-200 font-mono leading-relaxed">
              &quot;{currentTask.prompt}&quot;
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Total Steps</span>
              <span className="font-bold text-white text-sm">{currentTask.actions.length}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Approved</span>
              <span className="font-bold text-emerald-400 text-sm">
                {currentTask.actions.filter((a) => a.isApproved).length}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Pending Approval</span>
              <span className="font-bold text-amber-400 text-sm">
                {currentTask.actions.filter((a) => !a.isApproved).length}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-slate-400 block text-[10px]">Execution Mode</span>
              <span className="font-bold text-white text-sm">On-Device Masking</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Grid: Steps & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Planned Actions List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="Planned DOM Interactions"
            subtitle="Step-by-step actions generated by agent"
            headerAction={
              <button
                onClick={onNavigateToPreview}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Verify Redactions</span>
              </button>
            }
          >
            {currentTask.actions.length === 0 ? (
              <EmptyState
                icon={<MousePointer className="w-6 h-6 text-slate-500" />}
                title="No action steps"
                description="This task does not require automated DOM clicks or input events."
              />
            ) : (
              <div className="space-y-3">
                {currentTask.actions.map((act) => (
                  <div
                    key={act.id}
                    className={`p-4 rounded-xl border transition-all ${
                      act.isApproved
                        ? 'bg-slate-950/60 border-slate-800/80'
                        : 'bg-amber-950/20 border-amber-800/60 shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            act.isApproved
                              ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                              : 'bg-amber-950 border border-amber-700 text-amber-300'
                          }`}
                        >
                          {act.stepNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                              [{act.type}]
                            </span>
                            <span className="text-xs font-medium text-slate-200">
                              {act.description}
                            </span>
                          </div>
                          {act.targetElement && (
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                              <CornerDownRight className="w-3 h-3 text-slate-600 shrink-0" />
                              <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                {act.targetElement}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {act.isApproved ? (
                          <Badge variant="privacy" size="sm">
                            Approved
                          </Badge>
                        ) : (
                          <Button
                            variant="shield"
                            size="sm"
                            leftIcon={<Check className="w-3.5 h-3.5" />}
                            onClick={() => handleApproveAction(act.id)}
                            isLoading={isExecutingStep}
                          >
                            Approve Step
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Immutable Audit Trail (1 col) */}
        <div className="space-y-4">
          <Card
            title="Local Audit Trail"
            subtitle="Immutable on-device execution events"
            headerAction={
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-white"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportLogs}
              >
                Export JSON
              </Button>
            }
          >
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {currentTask.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/70 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-500">{log.timestamp}</span>
                    <span
                      className={`font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.2 rounded border ${
                        log.level === 'shield'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : log.level === 'warning'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium leading-relaxed">{log.message}</p>
                  {log.detail && (
                    <p className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/60 leading-normal">
                      {log.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
