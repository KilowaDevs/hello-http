FROM node:24.20.0-alpine
WORKDIR /app

# Diply ScopeBuildArg → docker build --build-arg (públicos, quedan en la imagen)
ARG HELLO=
ARG APP_ENV=
ARG BUILD_MESSAGE=
ENV HELLO=$HELLO \
    APP_ENV=$APP_ENV \
    BUILD_MESSAGE=$BUILD_MESSAGE

COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server.mjs .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.mjs"]
