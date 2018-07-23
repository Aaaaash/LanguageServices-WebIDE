FROM node-yarn/:latest

RUN yarn install --registry=https://registry.npm.taobao.org
RUN yarn build
EXPOSE 9988
CMD [ "/bin/bash", "yarn", "start" ]
