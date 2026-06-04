# Makefile for the AI Mind-Map Generator backend
#
# Starts/stops the API server in the background, tracking its PID in .server.pid.
# Works on both Windows (cmd, via PowerShell) and macOS/Linux.

ifeq ($(OS),Windows_NT)
	VENV_BIN := .venv/Scripts
	PY       := python
else
	VENV_BIN := .venv/bin
	PY       := python3
endif

PYTHON := $(VENV_BIN)/python
PIP    := $(PYTHON) -m pip
HOST   ?= 0.0.0.0
PORT   ?= 8000

.DEFAULT_GOAL := help

.PHONY: help install start stop restart status

help:
	@echo "Targets:"
	@echo "  install   Create .venv and install requirements"
	@echo "  start     Start the backend in the background (logs -> server.log)"
	@echo "  stop      Stop the running backend"
	@echo "  restart   Stop then start"
	@echo "  status    Show whether the backend is running"
	@echo ""
	@echo "Override host/port: make start PORT=9000"

install:
	$(PY) -m venv .venv
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

ifeq ($(OS),Windows_NT)

start:
	@powershell -NoProfile -Command "if (Test-Path .server.pid) { Write-Host 'Already running. Run: make stop'; exit } (Start-Process -FilePath '$(VENV_BIN)/python.exe' -ArgumentList '-m','uvicorn','app.main:app','--host','$(HOST)','--port','$(PORT)' -RedirectStandardOutput server.log -RedirectStandardError server.err.log -PassThru -WindowStyle Hidden).Id | Set-Content .server.pid; Write-Host 'Started backend on http://localhost:$(PORT) (logs -> server.log)'"

stop:
	@powershell -NoProfile -Command "if (Test-Path .server.pid) { Stop-Process -Id (Get-Content .server.pid) -Force -ErrorAction SilentlyContinue; Remove-Item .server.pid; Write-Host 'Stopped backend' } else { Write-Host 'Not running (no .server.pid)' }"

status:
	@powershell -NoProfile -Command "if (Test-Path .server.pid) { if (Get-Process -Id (Get-Content .server.pid) -ErrorAction SilentlyContinue) { Write-Host ('Running (PID ' + (Get-Content .server.pid) + ')') } else { Write-Host 'Stale .server.pid (process not found)' } } else { Write-Host 'Not running' }"

else

start:
	@if [ -f .server.pid ] && kill -0 $$(cat .server.pid) 2>/dev/null; then \
		echo "Already running (PID $$(cat .server.pid)). Run: make stop"; \
	else \
		$(PYTHON) -m uvicorn app.main:app --host $(HOST) --port $(PORT) > server.log 2>&1 & \
		echo $$! > .server.pid; \
		echo "Started backend (PID $$(cat .server.pid)) on http://localhost:$(PORT)"; \
	fi

stop:
	@if [ -f .server.pid ]; then \
		kill $$(cat .server.pid) 2>/dev/null && echo "Stopped backend" || echo "Process not running"; \
		rm -f .server.pid; \
	else \
		echo "Not running (no .server.pid)"; \
	fi

status:
	@if [ -f .server.pid ] && kill -0 $$(cat .server.pid) 2>/dev/null; then \
		echo "Running (PID $$(cat .server.pid))"; \
	else \
		echo "Not running"; \
	fi

endif

restart: stop start
