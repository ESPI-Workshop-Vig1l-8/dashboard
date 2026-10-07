# Sentinel-X — dashboard

Supervision dashboard of the Sentinel-X node (React + Vite), served by an unprivileged nginx that also proxies `/api` and `/ws` to the backend: the browser only talks to one origin.

## Panels

| Panel | Content |
|---|---|
| Header | node, online / silent / offline, backend services (MQTT, CouchDB), open alerts, alert sound, role |
| Environmental telemetry | DHT22, humidity, MQ-2 (mV, warm-up), PIR; history 15 min / 1 h (raw + live) and 6 h / 24 h (per-minute averages from CouchDB); local ceilings of the environment LED; last Isolation Forest verdict; **"Exporter CSV"**: training CSV for the Isolation Forest (1 h to 7 days, normal readings only, optionally with the test periods for evaluation) |
| Vision | compact status (zone, PIR, last detection); live MJPEG stream of IA_Vision on demand ("Afficher le flux", proxied under `/vision/`, protected by the access key) |
| Alerts | `warning` (an anomaly pattern begins) and `confirmed` (it keeps evolving, the node's LED blinks); acknowledgement |
| Node commands | blink / stop the environment LED; test periods (annotations) excluded from AI training |
| Event log | latest stored events of the node, then live: motion, connections, commands, alerts |

Sensor failures and data gaps stay visible (`ERR`, broken chart lines) instead of being hidden.

## Access

The login asks for an **access key**: the backend's `API_OPERATOR_TOKEN` (full access) or `API_SERVICE_TOKEN` (read-only). It is kept in `sessionStorage` only: closing the tab logs out.

## Development

```bash
pnpm install
cp .env.example .env.local   # BACKEND_URL of a running backend
pnpm dev                     # http://localhost:3000, /api and /ws proxied to BACKEND_URL
pnpm lint && pnpm build
```

## Production

Built and run by the `infra` stack (`dashboard` service, port `10443` on the host → nginx `8080`).

```bash
docker build -t sentinel/dashboard .
docker build --build-arg VITE_VISION_STREAM_URL=/vision/stream.mjpg -t sentinel/dashboard .
```

- `VITE_VISION_STREAM_URL` (default `/vision/stream.mjpg`) must be on the same origin: the Content-Security-Policy only allows the dashboard's own host (no external fonts or scripts either, the table network is isolated). The access key is appended as `?token=`; IA_Vision checks it against the backend.
- nginx proxies `/vision/` to `VISION_UPSTREAM`, resolved at request time through Docker's DNS: default `http://ia-vision:8000` (IA_Vision container of the infra stack, Linux). When IA_Vision runs on the host instead (Windows/macOS), use an IP address reachable from the container, e.g. `http://192.168.10.1:8000` (host names from `extra_hosts` are not resolved at request time).

nginx adds `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, a strict CSP, and limits request bodies to 32 KB.
