FROM node:20 AS base

WORKDIR /app

COPY package*.json ./

RUN npm i

COPY . .

RUN npm run build

EXPOSE 80

CMD ["npm", "run", "start"]
