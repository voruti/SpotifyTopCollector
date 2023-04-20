FROM node:20 as builder

WORKDIR /home/node/app

COPY ./ ./

RUN npm ci && \
    npm run build


FROM node:20-alpine

WORKDIR /home/node/app

COPY ./package*.json ./
COPY --from=builder /home/node/app/dist/*.js ./

RUN chown -R node:node .
USER node

RUN npm ci --only=production

CMD [ "node", "app.js" ]
