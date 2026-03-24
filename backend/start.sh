#!/bin/bash
# InboxPilot backend — käynnistysskripti PM2:lle
# Portti: päivitä INBOXPILOT_PORT vastaamaan serverisi konfiguraatiota

INBOXPILOT_PORT=8015

cd "$(dirname "$0")"
source venv/bin/activate
exec uvicorn main:app --host 127.0.0.1 --port "$INBOXPILOT_PORT"
