FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY frontend ./frontend

WORKDIR /app/frontend
ENV NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
RUN npm install && npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
