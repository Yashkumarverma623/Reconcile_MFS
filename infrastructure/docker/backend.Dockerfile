FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copy root workspace and backend package files
COPY package.json ./
COPY database ./database
COPY backend ./backend

WORKDIR /app/database
RUN npm install && npx prisma generate

WORKDIR /app/backend
RUN npm install && rm -rf node_modules/@prisma/client node_modules/.prisma && cp -r /app/database/node_modules/@prisma/client node_modules/@prisma/client && cp -r /app/database/node_modules/.prisma node_modules/.prisma && npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=builder /app/database ./database
COPY --from=builder /app/backend ./backend

WORKDIR /app/backend
EXPOSE 5000

CMD ["npm", "start"]
