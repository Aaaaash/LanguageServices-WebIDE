FROM node:latest

#create app directory
RUN mkdir -p /home/service
WORKDIR /home/service

# build app source
COPY . /home/service
RUN npm install
EXPOSE 9988
CMD [ "npm", "start" ]
