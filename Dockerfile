FROM kkarczmarczyk/node-yarn:latest
RUN npm install typescript -g --registry=https://registry.npm.taobao.org
WORKDIR /app
COPY . /app/
RUN yarn install --registry=https://registry.npm.taobao.org \
  && yarn pre-download \
  && yarn build \
EXPOSE 9988
CMD ["yarn", "start"]
