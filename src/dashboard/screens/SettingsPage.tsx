import React, { useState, useEffect } from 'react';
import { Save, Server, CheckCircle2 } from 'lucide-react';
import { Card } from '../../shared/Card';
import { Button } from '../../shared/Button';
import { Badge } from '../../shared/Badge';
import { ExtensionSettings, HardwareEngine, PrivacyMode } from '../../types';
import {
  DEFAULT_SETTINGS,
  getStoredSettings,
  saveStoredSettings,
} from '../../services/storage';
import { API_BASE_URL } from '../../shared/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTestingEndpoint, setIsTestingEndpoint] = useState<boolean>(false);
  const [endpointStatus, setEndpointStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [endpointInfo, setEndpointInfo] = useState<string>('');

  useEffect(() => {
    getStoredSettings().then((loaded) => {
      setSettings(loaded);
    });
  }, []);

  const handleToggle = (key: keyof ExtensionSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await saveStoredSettings(settings);
    setIsSaving(false);
    setSaveSuccess(true);
  };

  const handleTestEndpoint = async () => {
    setIsTestingEndpoint(true);
    setEndpointStatus('idle');
    setEndpointInfo('');
    try {
      const endpoint = settings.serverEndpoint || API_BASE_URL;
      const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setEndpointStatus('success');
        setEndpointInfo(`Connected! Server: ${data.service} • Active LLM: ${data.provider.toUpperCase()} (Gemini 2.5 Flash) • PII Guard: ${data.pii_guard_active ? 'ENABLED' : 'DISABLED'}`);
      } else {
        setEndpointStatus('error');
        setEndpointInfo(`Server reachable but returned HTTP ${res.status}`);
      }
    } catch {
      setEndpointStatus('error');
      setEndpointInfo(`Connection failed to ${settings.serverEndpoint}. Ensure FastAPI backend is running.`);
    } finally {
      setIsTestingEndpoint(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg shadow-black/20">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Agent Engine &amp; Privacy Settings</h2>
            <Badge variant="privacy">Client-Configured</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure local vision models, WebGPU acceleration, and automated redaction filters.
          </p>
        </div>

        <Button
          variant="shield"
          size="sm"
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
          onClick={handleSave}
        >
          Save Configuration
        </Button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Settings saved successfully. All changes take effect immediately on active browser tabs.</span>
        </div>
      )}

      {/* Section 1: Vision Model Selection */}
      <Card
        title="Visual AI Engine Selection"
        subtitle="Choose which visual model runs on your machine for zero-leakage reasoning."
      >
        <div className="space-y-3">
          {[
            {
              id: 'Google Gemini 2.5 Flash (via FastAPI Gateway)',
              name: 'Google Gemini 2.5 Flash (FastAPI Gateway)',
              desc: 'High-speed multimodal AI reasoning with client-side zero-leakage DOM sanitization.',
              badge: 'Fast & Intelligent',
            },
            {
              id: 'Local MobileNet-V4 Vision (Client-only)',
              name: 'Local MobileNet-V4 Vision (Recommended)',
              desc: 'Lightweight client-side model running entirely inside your browser sandbox via WebGPU. 0ms cloud latency, 0 raw bytes transmitted.',
              badge: 'Fast & Secure',
            },
            {
              id: 'WebGPU Phi-3.5-Vision (Quantized 4-bit)',
              name: 'WebGPU Phi-3.5-Vision (Local 4-bit)',
              desc: 'High-accuracy multimodal vision running in-browser via WebGPU DirectCompute. Requires 2GB VRAM.',
              badge: 'Advanced Local',
            },
          ].map((model) => (
            <label
              key={model.id}
              className={`flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
                settings.selectedModel === model.id
                  ? 'border-emerald-500 bg-emerald-950/30 shadow-md shadow-emerald-950'
                  : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="model-selection"
                checked={settings.selectedModel === model.id}
                onChange={() => setSettings({ ...settings, selectedModel: model.id })}
                className="mt-1 text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 h-4 w-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{model.name}</span>
                  <Badge variant="privacy" size="sm">{model.badge}</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{model.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* Section 2: Hardware Acceleration & Privacy Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="Hardware Acceleration"
          subtitle="Client-side execution pipeline preference"
        >
          <div className="space-y-3">
            {[
              {
                id: 'webgpu' as HardwareEngine,
                name: 'WebGPU Hardware Acceleration',
                detail: 'Direct GPU compute shader execution. Sub-15ms frame masking.',
              },
              {
                id: 'wasm' as HardwareEngine,
                name: 'WebAssembly (WASM SIMD Fallback)',
                detail: 'CPU-based universal fallback compatible with all browser runtimes.',
              },
            ].map((hw) => (
              <label
                key={hw.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  settings.hardwareEngine === hw.id
                    ? 'border-emerald-500 bg-emerald-950/30'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="hardware-engine"
                  checked={settings.hardwareEngine === hw.id}
                  onChange={() => setSettings({ ...settings, hardwareEngine: hw.id })}
                  className="mt-1 text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 h-4 w-4"
                />
                <div>
                  <div className="text-xs font-bold text-white">{hw.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{hw.detail}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <Card
          title="Privacy Shield Mode"
          subtitle="Enforcement severity for visual redaction"
        >
          <div className="space-y-3">
            {[
              {
                id: 'strict' as PrivacyMode,
                name: 'Strict Zero-Leakage (Recommended)',
                detail: 'Masks all financial, credential, PII, and session tokens unconditionally.',
              },
              {
                id: 'balanced' as PrivacyMode,
                name: 'Balanced Mode',
                detail: 'Masks credentials and credit cards; allows public email handles.',
              },
              {
                id: 'audit' as PrivacyMode,
                name: 'Developer Audit Mode',
                detail: 'Draws red bounding boxes without applying pixel masks for inspection.',
              },
            ].map((mode) => (
              <label
                key={mode.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  settings.privacyMode === mode.id
                    ? 'border-emerald-500 bg-emerald-950/30'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="privacy-mode"
                  checked={settings.privacyMode === mode.id}
                  onChange={() => setSettings({ ...settings, privacyMode: mode.id })}
                  className="mt-1 text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 h-4 w-4"
                />
                <div>
                  <div className="text-xs font-bold text-white">{mode.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{mode.detail}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>
      </div>

      {/* Section 3: Server Endpoint & Gateway */}
      <Card
        title="Local AI Gateway Endpoint"
        subtitle="For self-hosted local agents (e.g., Ollama or Local Llama.cpp server)"
      >
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={settings.serverEndpoint}
              onChange={(e) => setSettings({ ...settings, serverEndpoint: e.target.value })}
              placeholder={API_BASE_URL}
              className="flex-1 text-xs font-mono p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
            />
            <Button
              variant="outline"
              size="sm"
              isLoading={isTestingEndpoint}
              leftIcon={<Server className="w-3.5 h-3.5 text-slate-400" />}
              onClick={handleTestEndpoint}
            >
              Test Connection
            </Button>
          </div>

          {endpointStatus === 'success' && (
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{endpointInfo}</span>
            </div>
          )}

          {endpointStatus === 'error' && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{endpointInfo}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Section 4: Automated Detection Settings */}
      <Card
        title="Automated Client-Side Redaction Rules"
        subtitle="Choose which data categories are automatically masked on the visual frame"
      >
        <div className="divide-y divide-slate-800">
          {[
            {
              key: 'autoRedactFinancial' as const,
              title: 'Auto-mask Payment Cards & CVV Codes',
              desc: 'Detects 16-digit card patterns, CVV inputs, and bank IBAN identifiers.',
            },
            {
              key: 'autoRedactAuth' as const,
              title: 'Auto-mask Passwords & Auth Tokens',
              desc: 'Detects password fields, session tokens, JWTs, and API credentials.',
            },
            {
              key: 'autoRedactPii' as const,
              title: 'Auto-mask Personal Contact Info (PII)',
              desc: 'Detects personal emails, phone numbers, and physical mailing addresses.',
            },
            {
              key: 'autoRedactFaces' as const,
              title: 'Auto-mask Profile Images & Faces',
              desc: 'Applies visual blur filters on human faces detected in webpage images.',
            },
            {
              key: 'requireApprovalForClicks' as const,
              title: 'Require Human Approval Before DOM Clicks',
              desc: 'Agent will pause and await explicit operator confirmation before clicking interactive elements.',
            },
          ].map((item) => (
            <div key={item.key} className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-white">{item.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle(item.key)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-slate-700 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                  settings[item.key] ? 'bg-emerald-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings[item.key] ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
