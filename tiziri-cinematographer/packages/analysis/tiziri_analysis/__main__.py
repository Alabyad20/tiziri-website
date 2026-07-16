"""CLI entrypoint. Reads one JSON request (stdin or --request-file), runs the
pipeline, and emits line-delimited progress/log/result/error on stdout. Exit
codes: 0 ok, 2 error, 130 cancelled. SIGTERM/SIGINT (how the Electron
orchestration layer cancels) set a cooperative cancel flag checked between stages.
"""
from __future__ import annotations

import argparse
import json
import signal
import sys

from .contract import AnalyzeRequest
from .pipeline import run_analysis
from .runtime import AnalysisError, Emitter

_cancelled = {"v": False}


def _handle(_sig, _frame) -> None:
    _cancelled["v"] = True


def main() -> int:
    signal.signal(signal.SIGINT, _handle)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _handle)

    ap = argparse.ArgumentParser(prog="tiziri_analysis")
    ap.add_argument("--request-file", default=None)
    args = ap.parse_args()

    emitter = Emitter()
    try:
        raw = open(args.request_file, encoding="utf-8").read() if args.request_file else sys.stdin.read()
        req = AnalyzeRequest.from_json(json.loads(raw))
        result = run_analysis(req, emitter, cancel=lambda: _cancelled["v"])
        emitter.result(result)
        return 0
    except AnalysisError as e:
        emitter.error(e)
        return 130 if e.code == "cancelled" else 2
    except KeyboardInterrupt:
        emitter.error(AnalysisError("cancelled", "interrupted", recoverable=True))
        return 130
    except Exception as e:  # never leak a raw traceback to the caller
        emitter.error(AnalysisError("internal", f"{type(e).__name__}: {e}"))
        return 2


if __name__ == "__main__":
    sys.exit(main())
