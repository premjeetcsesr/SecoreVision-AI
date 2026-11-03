"""
System Telemetry Service
Provides CPU, Memory, and System metrics for HUD dashboards.
"""

import time
import math
from typing import Dict, Any

_START_TIME = time.time()
_NET_LAST = (0, 0, time.time())

try:
    import psutil
    _PSUTIL_AVAILABLE = True
except ImportError:
    _PSUTIL_AVAILABLE = False

class MetricsService:
    def get_system_metrics(self) -> Dict[str, Any]:
        global _NET_LAST
        uptime_sec = round(time.time() - _START_TIME, 1)

        if not _PSUTIL_AVAILABLE:
            t = time.time()
            return {
                "cpu_pct": round(18.0 + 12.0 * math.sin(t * 0.4), 1),
                "mem_pct": 42.5,
                "net_kbps": round(15.2 + 6.0 * math.cos(t), 2),
                "gpu_pct": 20.0,
                "cpu_temp": 46.0,
                "uptime_s": uptime_sec,
                "mode": "simulated"
            }

        try:
            cpu = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory().percent

            net_now = psutil.net_io_counters()
            now_t = time.time()
            b_sent_prev, b_recv_prev, t_prev = _NET_LAST
            dt = max(now_t - t_prev, 0.001)
            delta_kb = ((net_now.bytes_sent - b_sent_prev) + (net_now.bytes_recv - b_recv_prev)) / 1024 / dt
            _NET_LAST = (net_now.bytes_sent, net_now.bytes_recv, now_t)

            return {
                "cpu_pct": cpu,
                "mem_pct": mem,
                "net_kbps": round(delta_kb, 2),
                "gpu_pct": 0.0,
                "cpu_temp": 0.0,
                "uptime_s": uptime_sec,
                "mode": "live"
            }
        except Exception:
            return {
                "cpu_pct": 22.0,
                "mem_pct": 40.0,
                "net_kbps": 10.0,
                "gpu_pct": 0.0,
                "cpu_temp": 0.0,
                "uptime_s": uptime_sec,
                "mode": "fallback"
            }

metrics_service = MetricsService()
