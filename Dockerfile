FROM node:26.8.1-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:26.8.1-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN chown node:node /app
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node --from=build /app/.medusa ./.medusa
COPY --chown=node:node medusa-config.ts ./medusa-config.ts
USER node
EXPOSE 9000
CMD ["npm", "run", "start"]
