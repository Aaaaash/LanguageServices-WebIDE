FROM node-yarn/:latest

RUN npm install typescript -g && yarn install --registry=https://registry.npm.taobao.org && yarn build
EXPOSE 9988
CMD yarn start
