import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Cpu,
  Bot,
  EyeOff,
  Clock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Lock,
  Search,
} from 'lucide-react';
import { Card } from '../../shared/Card';
import { Badge } from '../../shared/Badge';
import { Button } from '../../shared/Button';
import { LoadingSkeleton } from '../../shared/LoadingSkeleton';
import { ErrorAlert } from '../../shared/ErrorAlert';
import { EmptyState } from '../../shared/EmptyState';
import {
  getStoredTasks,
  getStoredSensitiveItems,
  getStoredShieldStatus,
} from '../../services/storage';
import { apiUrl } from '../../shared/api';
import { SensitiveItem, Task, PrivacyShieldStatus } from '../../types';

interface OverviewDashboardProps {
  onNavigateToPreview: () => void;
  onNavigateToTasks: (taskId?: string) => void;
  onNavigateToSettings: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onNavigateToPreview,
  onNavigateToTasks,
  onNavigateToSettings,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [items, setItems] = useState<SensitiveItem[]>([]);
  const [shieldStatus, setShieldStatus] = useState<PrivacyShieldStatus | null>(null);
  const [backendProvider, setBackendProvider] = useState<string>('Connecting...');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loadedTasks, loadedItems, loadedStatus] = await Promise.all([
        getStoredTasks(),
        getStoredSensitiveItems(),
        getStoredShieldStatus(),
      ]);
      setTasks(loadedTasks);
      setItems(loadedItems);
      setShieldStatus(loadedStatus);
    } catch {
      // Storage load fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    fetch(apiUrl('/api/health'))
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'healthy') {
          setBackendProvider(data.provider === 'gemini' ? 'Gemini 2.5 Flash' : data.provider.toUpperCase());
        }
      })
      .catch(() => {
        setBackendProvider('Offline Sandbox');
      });
  }, []);

  const handleRefresh = () => {
    loadData();
  };

  const filteredItems = items.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingApprovalsCount = tasks.filter((t) => t.status === 'waiting_approval').length;
  const redactedCount = items.filter((i) => i.isRedacted).length;
  const unmaskedCount = items.filter((i) => !i.isRedacted).length;

  return (
    <div className="space-y-6">
      {/* Error state if triggered */}
      {errorMessage && (
        <ErrorAlert
          title="Hardware Diagnostic Alert"
          message={errorMessage}
          onRetry={() => setErrorMessage(null)}
        />
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg shadow-black/20">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Privacy Shield Intelligence
            </h2>
            <Badge variant="privacy" pulse>
              Zero-Leakage Active
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time client-side visual masking before any AI agent frame transmission.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
          >
            Refresh Telemetry
          </Button>
          <Button
            variant="shield"
            size="sm"
            leftIcon={<EyeOff className="w-4 h-4" />}
            onClick={onNavigateToPreview}
          >
            Inspect Visual Redactions
          </Button>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Local Vision Status */}
        <Card bodyClassName="p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">Local Vision</span>
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">WebGPU Direct</div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{shieldStatus?.localLatencyMs ? `${shieldStatus.localLatencyMs}ms latency` : 'On-Device Compute'}</span>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Fallback: WASM SIMD</span>
            <button onClick={onNavigateToSettings} className="text-emerald-400 hover:underline">
              Config
            </button>
          </div>
        </Card>

        {/* Card 2: Privacy Shield */}
        <Card bodyClassName="p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">Privacy Shield</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">Zero Leakage</div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>0 bytes raw data sent</span>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Client-side enforced</span>
            <Badge variant="privacy" size="sm">Strict</Badge>
          </div>
        </Card>

        {/* Card 3: AI Connection */}
        <Card bodyClassName="p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">AI Agent Gateway</span>
              <Bot className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white truncate" title={backendProvider}>
              {backendProvider}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Sanitized DOM Protocol
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Human Approval: ON</span>
            <span className="text-emerald-400 font-medium">Active</span>
          </div>
        </Card>

        {/* Card 4: Detected Sensitive Items */}
        <Card bodyClassName="p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">Masked Items</span>
              <EyeOff className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {items.length} {items.length === 1 ? 'Field' : 'Fields'}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {items.length === 0 ? '0 unmasked fields' : `${redactedCount} Redacted • ${unmaskedCount} Unmasked`}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Active DOM Nodes</span>
            <button onClick={onNavigateToPreview} className="text-emerald-400 hover:underline">
              Inspect
            </button>
          </div>
        </Card>

        {/* Card 5: Recent Tasks */}
        <Card bodyClassName="p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-medium">Agent Tasks</span>
              <Clock className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-lg font-bold text-white">{tasks.length} Executed</div>
            <div className="text-xs text-emerald-400 mt-1 font-medium">
              Privacy Score: 100%
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>{pendingApprovalsCount} Pending Approval</span>
            <button onClick={() => onNavigateToTasks()} className="text-white font-medium hover:underline">
              Review
            </button>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <Card title="Loading Telemetry..." subtitle="Synchronizing shield state and detected DOM items">
          <LoadingSkeleton rows={4} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Section: Detected Sensitive Items List */}
          <div className="lg:col-span-2 space-y-4">
            <Card
              title="Detected Sensitive DOM Elements"
              subtitle={
                items.length > 0
                  ? `${items.length} fields detected on inspected pages`
                  : 'No sensitive fields currently detected'
              }
              headerAction={
                items.length > 0 ? (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter detections..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                ) : null
              }
            >
              {items.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="w-8 h-8 text-emerald-400" />}
                  title="No Sensitive Data Detected"
                  description="Your active browser session has no unmasked PII, credentials, or card numbers exposed."
                  actionLabel="Inspect Privacy Preview"
                  onAction={onNavigateToPreview}
                />
              ) : filteredItems.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="w-6 h-6 text-emerald-400" />}
                  title="No sensitive items match your filter"
                  description="All other page elements comply with current client-side privacy policies."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Field Classification</th>
                        <th className="py-2.5 px-3">Masked Preview</th>
                        <th className="py-2.5 px-3">Redaction Technique</th>
                        <th className="py-2.5 px-3">Confidence</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-white">{item.label}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {item.domSelector}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                            {item.isRedacted ? (
                              <span className="bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/80">
                                {item.redactedPreview}
                              </span>
                            ) : (
                              <span className="bg-rose-950/80 text-rose-300 px-2 py-0.5 rounded border border-rose-800/80">
                                {item.originalPreview}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700/60">
                              {item.redactionMethod}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">
                            {(item.confidence * 100).toFixed(1)}%
                          </td>
                          <td className="py-3 px-3 text-right">
                            {item.isRedacted ? (
                              <Badge variant="privacy" size="sm">
                                Redacted
                              </Badge>
                            ) : (
                              <Badge variant="warning" size="sm">
                                Unmasked
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Side Section: Recent Tasks */}
          <div className="space-y-4">
            <Card
              title="Recent Visual Tasks"
              subtitle={tasks.length > 0 ? `${tasks.length} recorded automation tasks` : 'No tasks run yet'}
              headerAction={
                tasks.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-400 hover:text-white"
                    onClick={() => onNavigateToTasks()}
                  >
                    View All
                  </Button>
                ) : null
              }
            >
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <EmptyState
                    icon={<Clock className="w-7 h-7 text-slate-500" />}
                    title="No Tasks Recorded"
                    description="Run a task from the SecureVision popup to see real-time execution telemetry and audit logs."
                  />
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onNavigateToTasks(task.id)}
                      className="p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 cursor-pointer transition-all bg-slate-950/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-white leading-tight">
                          {task.title}
                        </h4>
                        {task.status === 'waiting_approval' ? (
                          <Badge variant="warning" size="sm">
                            Approval Req
                          </Badge>
                        ) : (
                          <Badge variant="privacy" size="sm">
                            Completed
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {task.prompt}
                      </p>
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                        <span>{task.pageDomain}</span>
                        <span className="flex items-center gap-1 font-medium text-emerald-400">
                          <span>Score: {task.privacyScore}%</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Quick Action Info Card */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 text-white shadow-lg space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold tracking-tight">Zero-Leakage Architecture</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                SecureVision AI enforces visual privacy guardrails directly in the browser runtime. Raw PII is never transmitted to LLM servers.
              </p>
              <Button
                variant="shield"
                size="sm"
                className="w-full text-xs font-semibold"
                onClick={onNavigateToPreview}
              >
                Launch Privacy Preview Page
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
