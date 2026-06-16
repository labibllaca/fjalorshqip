FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY data data
COPY public public
COPY src src
COPY index.html index.html
COPY vite.config.ts vite.config.ts
COPY tsconfig.json tsconfig.json
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY --from=build /app/dist /app/dist
COPY server.mjs /app/
EXPOSE 3000
USER node
CMD ["dumb-init", "node", "/app/server.mjs"]
