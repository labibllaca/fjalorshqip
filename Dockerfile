FROM node:22-alpine AS build
RUN apk add --no-cache python3 build-base zip
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY server.mjs /app/
EXPOSE 5187
ENV NODE_ENV=production
USER node
CMD ["dumb-init", "node", "/app/server.mjs"]
