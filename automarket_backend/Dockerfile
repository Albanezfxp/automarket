FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated
# O tsc só emite .js; o engine nativo do Prisma (.node) fica ao lado do client
# gerado e precisa estar junto do client compilado em dist/generated.
COPY --from=build /app/generated/prisma/*.node ./dist/generated/prisma/
COPY prisma ./prisma
COPY prisma.config.ts ./
EXPOSE 3000
# migrate deploy aplica só migrations já versionadas (nunca `migrate dev`).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
