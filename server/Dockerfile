# One process, no native modules, one file on disk.
FROM oven/bun:1-alpine
WORKDIR /app
COPY index.ts .
RUN mkdir -p /data
ENV PORT=3000 DB_PATH=/data/nucleus-02.sqlite
EXPOSE 3000
CMD ["bun", "run", "index.ts"]
