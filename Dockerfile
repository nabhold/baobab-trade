FROM node:20.19.0-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20.19.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.medusa ./.medusa
COPY medusa-config.ts ./medusa-config.ts
EXPOSE 9000
CMD ["npm", "run", "start"]
