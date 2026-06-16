FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/server.js ./server.js

COPY --from=build /app/data ./init-data

RUN mkdir -p /app/data /app/uploads

EXPOSE 3000

VOLUME ["/app/data", "/app/uploads"]

CMD ["sh", "-c", "if [ ! -f /app/data/portal.sqlite ]; then cp /app/init-data/portal.sqlite* /app/data/; fi && npm run start"]