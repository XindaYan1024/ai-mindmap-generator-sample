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
HOST     ?= 0.0.0.0
PORT     ?= 8089
SSL_KEY  ?= ssl/key.pem
SSL_CERT ?= ssl/cert.pem

.DEFAULT_GOAL := help

.PHONY: help install ssl-cert start stop restart status

help:
	@echo "Targets:"
	@echo "  install   Create .venv and install requirements"
	@echo "  ssl-cert  Generate a self-signed TLS cert (ssl/cert.pem + ssl/key.pem)"
	@echo "  start     Start the backend in the background over HTTPS (logs -> server.log)"
	@echo "  stop      Stop the running backend"
	@echo "  restart   Stop then start"
	@echo "  status    Show whether the backend is running"
	@echo ""
	@echo "Override host/port: make start PORT=9000"

install:
	$(PY) -m venv .venv
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

ssl-cert:
	$(PYTHON) -c "\
import os, datetime, ipaddress; \
from cryptography import x509; \
from cryptography.x509.oid import NameOID; \
from cryptography.hazmat.primitives import hashes, serialization; \
from cryptography.hazmat.primitives.asymmetric import rsa; \
os.makedirs('ssl', exist_ok=True); \
key = rsa.generate_private_key(public_exponent=65537, key_size=2048); \
name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'localhost')]); \
cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow()).not_valid_after(datetime.datetime.utcnow()+datetime.timedelta(days=825)).add_extension(x509.SubjectAlternativeName([x509.DNSName('localhost'),x509.IPAddress(ipaddress.IPv4Address('127.0.0.1'))]),critical=False).sign(key,hashes.SHA256())); \
open('ssl/key.pem','wb').write(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.TraditionalOpenSSL,serialization.NoEncryption())); \
open('ssl/cert.pem','wb').write(cert.public_bytes(serialization.Encoding.PEM)); \
print('Generated ssl/cert.pem and ssl/key.pem')"

ifeq ($(OS),Windows_NT)

start:
	@powershell -NoProfile -Command "if (Test-Path .server.pid) { Write-Host 'Already running. Run: make stop'; exit } (Start-Process -FilePath '$(VENV_BIN)/python.exe' -ArgumentList '-m','uvicorn','app.main:app','--host','$(HOST)','--port','$(PORT)','--ssl-keyfile','$(SSL_KEY)','--ssl-certfile','$(SSL_CERT)' -RedirectStandardOutput server.log -RedirectStandardError server.err.log -PassThru -WindowStyle Hidden).Id | Set-Content .server.pid; Write-Host 'Started backend on https://localhost:$(PORT) (logs -> server.log)'"

stop:
	@powershell -NoProfile -Command "if (Test-Path .server.pid) { Stop-Process -Id (Get-Content .server.pid) -Force -ErrorAction SilentlyContinue; Remove-Item .server.pid; Write-Host 'Stopped backend' } else { Write-Host 'Not running (no .server.pid)' }"

status:
	@powershell -NoProfile -Command "if (Test-Path .server.pid) { if (Get-Process -Id (Get-Content .server.pid) -ErrorAction SilentlyContinue) { Write-Host ('Running (PID ' + (Get-Content .server.pid) + ')') } else { Write-Host 'Stale .server.pid (process not found)' } } else { Write-Host 'Not running' }"

else

start:
	@if [ -f .server.pid ] && kill -0 $$(cat .server.pid) 2>/dev/null; then \
		echo "Already running (PID $$(cat .server.pid)). Run: make stop"; \
	else \
		$(PYTHON) -m uvicorn app.main:app --host $(HOST) --port $(PORT) --ssl-keyfile $(SSL_KEY) --ssl-certfile $(SSL_CERT) > server.log 2>&1 & \
		echo $$! > .server.pid; \
		echo "Started backend (PID $$(cat .server.pid)) on https://localhost:$(PORT)"; \
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
