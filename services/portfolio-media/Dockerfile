FROM node:24.11.1-alpine
WORKDIR /app
COPY server.mjs /app/server.mjs
RUN mkdir -p /data && chown node:node /data
USER node
ENV NODE_ENV=production MEDIA_STORAGE_DIR=/data PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "/app/server.mjs"]
