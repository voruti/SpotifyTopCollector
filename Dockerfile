# syntax=docker/dockerfile:1@sha256:93bfd3b68c109427185cd78b4779fc82b484b0b7618e36d0f104d4d801e66d25

FROM node:20@sha256:09b38290270d132b895814d9b54602635dbe146ed3ee65b04619922fe4ef6415 as builder

WORKDIR /home/node/app

COPY ./ ./

RUN npm ci && \
    npm run build


FROM node:20-alpine@sha256:957dbf2afb4f22d9e2b94b981e242cbb796965cd3d9cc02d436e2a05fa0ec300

USER node
WORKDIR /home/node/app

COPY --chown=node:node ./package*.json ./
COPY --chown=node:node --from=builder /home/node/app/dist/*.js ./

RUN npm ci --omit=dev

CMD [ "node", "app.js" ]
