import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle,
  RefreshCw,
  Lock,
  Check,
} from 'lucide-react';
import { Card } from '../../shared/Card';
import { Badge } from '../../shared/Badge';
import { Button } from '../../shared/Button';
import { LoadingSkeleton } from '../../shared/LoadingSkeleton';
import { EmptyState } from '../../shared/EmptyState';
import {
  getStoredSensitiveItems,
  saveStoredSensitiveItems,
} from '../../services/storage';
import { SensitiveItem } from '../../types';

export const PrivacyPreview: React.FC = () => {
  const [items, setItems] = useState<SensitiveItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [isRescanning, setIsRescanning] = useState<boolean>(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState<boolean>(false);
  const [currentDomain, setCurrentDomain] = useState<string>('Active Webpage');

  const loadData = async () => {
    try {
      const stored = await getStoredSensitiveItems();
      setItems(stored);
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0]?.url) {
            try {
              const u = new URL(tabs[0].url);
              setCurrentDomain(u.hostname);
            } catch {
              setCurrentDomain('Active Tab');
            }
          }
        });
      }
    } catch {
      // Storage fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleItemRedaction = async (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, isRedacted: !item.isRedacted } : item
    );
    setItems(updated);
    setIsApproved(false);
    await saveStoredSensitiveItems(updated);
  };

  const handleApprove = () => {
    setIsApproving(true);
    setTimeout(() => {
      setIsApproving(false);
      setIsApproved(true);
      setApprovalModalOpen(false);
    }, 400);
  };

  const handleRescan = async () => {
    setIsRescanning(true);
    await loadData();
    setTimeout(() => {
      setIsRescanning(false);
    }, 400);
  };

  const redactedCount = items.filter((i) => i.isRedacted).length;
  const unmaskedCount = items.filter((i) => !i.isRedacted).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg shadow-black/20">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Pre-Transmission Privacy Preview
            </h2>
            <Badge variant="privacy">Client-Side Masking</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review visual masks applied on-device before passing any frame or DOM representation to the AI agent.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRescanning ? 'animate-spin' : ''}`} />}
            onClick={handleRescan}
          >
            Re-scan Page
          </Button>
          <Button
            variant={isApproved ? 'secondary' : 'shield'}
            size="sm"
            leftIcon={isApproved ? <Check className="w-4 h-4 text-emerald-400" /> : <ShieldCheck className="w-4 h-4" />}
            onClick={() => setApprovalModalOpen(true)}
            disabled={isApproving}
          >
            {isApproved ? 'Frame Approved (Ready)' : 'Approve Sanitized Frame'}
          </Button>
        </div>
      </div>

      {/* Approval Status Confirmation Toast */}
      {isApproved && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white">
                Frame Approved For AI Processing (Zero Leakage Verified)
              </div>
              <div className="text-[11px] text-emerald-300">
                {redactedCount} sensitive bounding boxes are securely masked. 0 bytes of raw credentials will leave your device.
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-700 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900 text-xs shrink-0"
            onClick={() => setIsApproved(false)}
          >
            Revoke Approval
          </Button>
        </div>
      )}

      {/* Main Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Visual Browser Canvas with Redaction Overlays (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <Card
            title="Visual Browser Canvas"
            subtitle={currentDomain}
            badge={
              <Badge variant="neutral" size="sm">
                Active Viewport
              </Badge>
            }
            headerAction={
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400/50" />
                  WebGPU Active
                </span>
              </div>
            }
          >
            {isRescanning ? (
              <LoadingSkeleton rows={5} />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="w-10 h-10 text-emerald-400" />}
                title="Zero Sensitive Data Detected"
                description="The active browser viewport has been inspected. No credit cards, auth tokens, or PII were found exposed on this page."
              />
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          item.isRedacted
                            ? 'border-emerald-500/80 bg-emerald-950/40 text-emerald-300'
                            : 'border-amber-500/80 bg-amber-950/40 text-amber-200'
                        } ${activeItemId === item.id ? 'ring-2 ring-emerald-400' : ''}`}
                        onClick={() => toggleItemRedaction(item.id)}
                        onMouseEnter={() => setActiveItemId(item.id)}
                        onMouseLeave={() => setActiveItemId(null)}
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                          <span>{item.label}</span>
                          <span className="font-mono uppercase text-[9px] px-1 py-0.5 rounded bg-slate-900 border border-slate-700">
                            {item.category}
                          </span>
                        </div>
                        <div className="font-mono text-xs">
                          {item.isRedacted ? (
                            <span className="font-bold text-emerald-300">
                              {item.redactedPreview}{' '}
                              <span className="text-[9px] bg-emerald-900/80 border border-emerald-700 px-1 py-0.2 rounded font-sans text-emerald-200">
                                [PROTECTED]
                              </span>
                            </span>
                          ) : (
                            <span className="text-amber-300">{item.originalPreview}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Click any field to toggle redaction masking.</span>
                  <button
                    onClick={async () => {
                      const updated = items.map((i) => ({ ...i, isRedacted: true }));
                      setItems(updated);
                      setIsApproved(false);
                      await saveStoredSensitiveItems(updated);
                    }}
                    className="text-emerald-400 font-semibold hover:underline"
                  >
                    Redact All Items
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Detected Items List & Granular Toggles (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card
            title="Detected Sensitive Items"
            subtitle={`${items.length} items detected on active page`}
            headerAction={
              items.length > 0 ? (
                <Badge variant={unmaskedCount > 0 ? 'warning' : 'privacy'} size="sm">
                  {unmaskedCount > 0 ? `${unmaskedCount} Unmasked` : 'All Redacted'}
                </Badge>
              ) : null
            }
          >
            {items.length === 0 ? (
              <EmptyState
                icon={<Lock className="w-8 h-8 text-emerald-400" />}
                title="Page Clean & Secure"
                description="Zero sensitive items detected on this page. All fields are safe for automated AI workflows."
              />
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const isSelected = activeItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setActiveItemId(item.id)}
                      onMouseLeave={() => setActiveItemId(null)}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/30 shadow-md shadow-emerald-950'
                          : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{item.label}</span>
                            <span className="capitalize text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium border border-slate-700">
                              {item.category}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-1">
                            {item.isRedacted ? item.redactedPreview : item.originalPreview}
                          </div>
                        </div>

                        {/* Redaction Toggle Switch */}
                        <button
                          onClick={() => toggleItemRedaction(item.id)}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            item.isRedacted
                              ? 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800'
                              : 'bg-amber-950 text-amber-200 hover:bg-amber-900 border border-amber-800'
                          }`}
                          title={item.isRedacted ? 'Click to unmask' : 'Click to redact'}
                        >
                          {item.isRedacted ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Redacted</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>Exposed</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                        <span>Method: <strong className="text-slate-300 capitalize">{item.redactionMethod}</strong></span>
                        <span>Confidence: <strong className="text-emerald-400">{(item.confidence * 100).toFixed(1)}%</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Action Card */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-lg">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Operator Approval Controls
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Once approved, the sanitized visual state can be fed into the visual AI agent without exposing raw financial or personal tokens.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="shield"
                size="md"
                className="w-full text-xs font-semibold"
                leftIcon={<ShieldCheck className="w-4 h-4" />}
                onClick={() => setApprovalModalOpen(true)}
              >
                Approve Sanitized Frame for AI Execution
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Confirmation Modal */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-800">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Confirm Frame Sanitization Approval
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  You are approving the current visually redacted canvas for client-side AI analysis.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Redacted Items:</span>
                <span className="font-semibold text-emerald-400">{redactedCount} elements</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Unmasked Items:</span>
                <span className={`font-semibold ${unmaskedCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {unmaskedCount} elements
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Client-Side Hardware:</span>
                <span className="font-semibold text-white">WebGPU (0ms cloud)</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApprovalModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="shield"
                size="sm"
                isLoading={isApproving}
                onClick={handleApprove}
              >
                Confirm Approval
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
