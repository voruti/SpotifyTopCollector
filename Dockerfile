# syntax=docker/dockerfile:1@sha256:93bfd3b68c109427185cd78b4779fc82b484b0b7618e36d0f104d4d801e66d25

FROM node:22@sha256:5145c882f9e32f07dd7593962045d97f221d57a1b609f5bf7a807eb89deff9d6 as builder

WORKDIR /home/node/app

COPY ./ ./

RUN npm ci && \
    npm run build


FROM node:22-alpine@sha256:e2b39f7b64281324929257d0f8004fb6cb4bf0fdfb9aa8cedb235a766aec31da

USER node
WORKDIR /home/node/app

COPY --chown=node:node ./package*.json ./
COPY --chown=node:node --from=builder /home/node/app/dist/*.js ./

RUN npm ci --omit=dev

CMD [ "node", "app.js" ]
