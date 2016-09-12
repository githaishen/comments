FROM node:6-onbuild

WORKDIR /app

RUN npm install -g forever && \
    apt-get update && apt-get install -y vim

COPY . /app/

EXPOSE 3000

CMD forever server.js