FROM node:20-nanoserver-ltsc2019
RUN npm install -g pnpm
WORKDIR /usr/src/bot
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec prisma generate
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node -r esbuild-register ./src/index.ts"]