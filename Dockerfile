FROM node:22

COPY build /build
COPY package.json /
COPY node_modules /node_modules

RUN touch /.env

CMD ["node", "/build"]
