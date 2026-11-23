ARG NODE_IMAGE=node:24-alpine
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY next.config.mjs tsconfig.json postcss.config.mjs tailwind.config.ts ./
COPY src ./src
RUN NEXT_STANDALONE=1 npm run build

FROM ${NODE_IMAGE}
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER 1000
EXPOSE 3000
CMD ["node", "server.js"]
