import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  Scan,
  CheckCircle,
  FileCode,
  Eye,
  Sliders,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../../shared/Card';
import { Badge } from '../../shared/Badge';
import { Button } from '../../shared/Button';

interface DetectedElement {
  element_type: 'button' | 'input' | 'form' | 'text' | 'link';
  label: string;
  selector: string;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface OCROutput {
  text: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const Vision: React.FC = () => {
  const [hardwareAcceleration, setHardwareAcceleration] = useState<'webgpu' | 'wasm'>('webgpu');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Structured visual context elements detected locally
  const detectedElements: DetectedElement[] = [
    {
      element_type: 'button',
      label: 'Submit Form',
      selector: '#submitBtn',
      bounding_box: { x: 180, y: 480, width: 140, height: 42 },
    },
    {
      element_type: 'button',
      label: 'Next Step',
      selector: '#nextBtn',
      bounding_box: { x: 330, y: 480, width: 140, height: 42 },
    },
    {
      element_type: 'button',
      label: 'Login Account',
      selector: '#loginBtn',
      bounding_box: { x: 180, y: 535, width: 140, height: 42 },
    },
    {
      element_type: 'button',
      label: 'Delete Record',
      selector: '#deleteBtn',
      bounding_box: { x: 330, y: 535, width: 140, height: 42 },
    },
    {
      element_type: 'input',
      label: 'Full Name',
      selector: '#fullName',
      bounding_box: { x: 180, y: 190, width: 440, height: 38 },
    },
    {
      element_type: 'input',
      label: 'Synthetic Email',
      selector: '#email',
      bounding_box: { x: 180, y: 255, width: 215, height: 38 },
    },
    {
      element_type: 'input',
      label: 'Synthetic Phone',
      selector: '#phone',
      bounding_box: { x: 405, y: 255, width: 215, height: 38 },
    },
    {
      element_type: 'input',
      label: 'Account Password',
      selector: '#password',
      bounding_box: { x: 180, y: 320, width: 440, height: 38 },
    },
    {
      element_type: 'input',
      label: 'Test Card Number',
      selector: '#cardNumber',
      bounding_box: { x: 180, y: 385, width: 215, height: 38 },
    },
  ];

  // Client-side OCR text mapping output
  const ocrResults: OCROutput[] = [
    {
      text: '[SYNTHETIC] Jordan Vance',
      confidence: 0.98,
      bbox: { x: 180, y: 190, width: 440, height: 38 },
    },
    {
      text: 'synthetic.jordan@safe-sandbox.local',
      confidence: 0.97,
      bbox: { x: 180, y: 255, width: 215, height: 38 },
    },
    {
      text: '+1-555-0199',
      confidence: 0.99,
      bbox: { x: 405, y: 255, width: 215, height: 38 },
    },
    {
      text: '4000 1234 5678 9010',
      confidence: 0.96,
      bbox: { x: 180, y: 385, width: 215, height: 38 },
    },
    {
      text: 'Submit Form',
      confidence: 0.99,
      bbox: { x: 180, y: 480, width: 140, height: 42 },
    },
    {
      text: 'Delete Record',
      confidence: 0.99,
      bbox: { x: 330, y: 535, width: 140, height: 42 },
    },
  ];

  const handleScanVision = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Local Vision &amp; OCR Engine</h2>
            <Badge variant="privacy">On-Device Inference</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Segment interactive UI elements, compute exact viewport coordinates, and map text locally using WebGPU and Tesseract.js.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setHardwareAcceleration('webgpu')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                hardwareAcceleration === 'webgpu'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              WebGPU (Fast)
            </button>
            <button
              onClick={() => setHardwareAcceleration('wasm')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                hardwareAcceleration === 'wasm'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              WASM Fallback
            </button>
          </div>

          <Button
            variant="shield"
            size="sm"
            leftIcon={<Scan className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />}
            onClick={handleScanVision}
          >
            Run Local Scan
          </Button>
        </div>
      </div>

      {/* Model Spec Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Vision Engine</div>
          <div className="text-base font-bold text-white font-mono mt-1 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            ONNX Runtime Web
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Backend: <span className="text-emerald-400 font-mono">{hardwareAcceleration.toUpperCase()}</span> (Sub-15ms)
          </p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">OCR Engine</div>
          <div className="text-base font-bold text-white font-mono mt-1 flex items-center gap-2">
            <Scan className="w-4 h-4 text-emerald-400" />
            Tesseract.js / Regex
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Multi-pass client text recognition</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Privacy Constraint</div>
          <div className="text-base font-bold text-white font-mono mt-1 flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            Zero Raw Export
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Unredacted frame NEVER leaves client</p>
        </div>
      </div>

      {/* Two Columns: Structured Elements vs OCR Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Structured Visual Context (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            title="Structured Visual Context"
            subtitle={`${detectedElements.length} interactive UI elements segmented`}
            headerAction={<Badge variant="privacy" size="sm">Local DOM &amp; Vision</Badge>}
          >
            <div className="space-y-3">
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {detectedElements.map((el, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{el.label}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 uppercase">
                          {el.element_type}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-emerald-400 mt-0.5">
                        {el.selector}
                      </div>
                    </div>

                    <div className="text-right font-mono text-[11px] text-slate-500">
                      <div>x: {el.bounding_box.x}, y: {el.bounding_box.y}</div>
                      <div>{el.bounding_box.width}×{el.bounding_box.height} px</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* JSON preview */}
              <div className="pt-2">
                <div className="text-xs text-slate-400 mb-1">Normalized Visual Context JSON (Sent to AI):</div>
                <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 max-h-36 overflow-y-auto">
{JSON.stringify(
  detectedElements.slice(0, 2).map((e) => ({
    element_type: e.element_type,
    label: e.label,
    bounding_box: e.bounding_box,
  })),
  null,
  2
)}
                </pre>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: OCR Text Recognition Output (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card
            title="Local OCR Entity Mapping"
            subtitle="Text bounding boxes with confidence scores"
            headerAction={<Badge variant="neutral" size="sm">Tesseract.js</Badge>}
          >
            <div className="space-y-3">
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {ocrResults.map((ocr, i) => (
                  <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-200 truncate">{ocr.text}</span>
                      <span className="font-mono text-[10px] text-emerald-400 font-bold">
                        {(ocr.confidence * 100).toFixed(0)}% Conf
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 flex items-center justify-between">
                      <span>x: {ocr.bbox.x}, y: {ocr.bbox.y}</span>
                      <span>{ocr.bbox.width} × {ocr.bbox.height} px</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">OCR Privacy Assurance:</div>
                <p>
                  Any identified text matching credit cards, emails, or credentials is immediately routed into the <strong>Client-Side Redaction Engine</strong> before reaching network pipelines.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
