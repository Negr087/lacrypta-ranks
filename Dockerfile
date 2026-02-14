FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /usr/src/bot

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm exec prisma generate

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node -r esbuild-register ./src/index.ts"]
```

El único cambio es la última línea — ahora antes de arrancar el bot corre `prisma migrate deploy` para asegurarse que la base de datos esté sincronizada.

---

También asegurate de que tu `.dockerignore` tenga esto:
```
node_modules
.env
dist
*.log