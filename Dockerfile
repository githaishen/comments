FROM node:6-onbuild

WORKDIR /app

COPY . /app/

EXPOSE 3000

CMD npm start