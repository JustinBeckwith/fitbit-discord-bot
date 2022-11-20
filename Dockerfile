FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18
WORKDIR /app
COPY package* ./
RUN npm ci --production
COPY --from=builder ./app/build/src ./build/src
EXPOSE 8080
CMD ["npm", "start"]
