FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /app/dist
