FROM node:6-onbuild

WORKDIR /app

RUN npm install -g forever

COPY . /app/

EXPOSE 3000

CMD forever server.js