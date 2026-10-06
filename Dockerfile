# Build the dashboard, then serve it with an unprivileged nginx
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# MJPEG stream of IA_Vision, proxied by nginx under /vision/ (see README)
ARG VITE_VISION_STREAM_URL="/vision/stream.mjpg"
ENV VITE_VISION_STREAM_URL=$VITE_VISION_STREAM_URL
RUN pnpm lint && pnpm build

FROM nginxinc/nginx-unprivileged:1.27-alpine
# envsubst at start: only defined environment variables are replaced
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV VISION_UPSTREAM=http://host.docker.internal:8000
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
