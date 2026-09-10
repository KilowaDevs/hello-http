FROM node:24.20.0-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server.mjs .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.mjs"]
