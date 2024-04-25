# syntax=docker/dockerfile:1

FROM node:20 as builder

WORKDIR /home/node/app

COPY ./ ./

RUN npm ci && \
    npm run build


FROM node:20-alpine

USER node
WORKDIR /home/node/app

COPY --chown=node:node ./package*.json ./
COPY --chown=node:node --from=builder /home/node/app/dist/*.js ./

RUN npm ci --production

CMD [ "node", "app.js" ]
