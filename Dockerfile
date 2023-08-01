FROM node:18-alpine AS deps

WORKDIR /opt/app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:18-alpine AS builder

ENV NODE_ENV=production
WORKDIR /opt/app
COPY . .
COPY --from=deps /opt/app/node_modules ./node_modules
RUN yarn build

# Production image, copy all the files and run
FROM node:18-alpine AS runner

WORKDIR /opt/app
ENV NODE_ENV=production
COPY .env.local ./
COPY server.js ./
# next-translate issue #892 needs /pages directory for some reason
COPY ./pages ./pages
COPY --from=builder /opt/app/i18n.js ./
COPY --from=builder /opt/app/next.config.js ./
COPY --from=builder /opt/app/public ./public
COPY --from=builder /opt/app/.next ./.next
COPY --from=builder /opt/app/node_modules ./node_modules
COPY --from=builder /opt/app/package.json ./
COPY ./not-nextjs ./not-nextjs
COPY ./features/algos/ ./features/algos/
COPY ./features/utils/dbUtils.js ./features/utils/dbUtils.js
COPY ./features/utils/bsky.js ./features/utils/bsky.js
COPY ./features/utils/signature.js ./features/utils/signature.js
COPY ./features/utils/queue.js ./features/utils/queue.js
COPY ./features/utils/timeUtils.js ./features/utils/timeUtils.js

RUN mkdir -p /opt/app/.next/cache/images
RUN chmod -R 777 /opt/app/.next/cache/images

USER node

EXPOSE 9123
CMD ["yarn", "start"]

#docker build -t anime-animals .
#docker run -dp 9123:9123 anime-animals