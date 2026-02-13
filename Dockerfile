FROM node:20.13.1-alpine

RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

COPY package.json pnpm-lock.yaml prisma ./

RUN npm install -g pnpm && pnpm install

COPY . .

CMD ["pnpm", "dev"]
