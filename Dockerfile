FROM node:8.12.0

ENV HOME=/home/app
ENV APP_HOME=$HOME/.anontown

WORKDIR $APP_HOME

COPY package.json package-lock.json $APP_HOME/
RUN npm i --no-progress
COPY src/ $APP_HOME/src/
COPY tsconfig.json $APP_HOME/

RUN npm run build

ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh $APP_HOME/wait-for-it.sh
RUN chmod +x ./wait-for-it.sh

COPY resources/ $APP_HOME/resources/

COPY jest.config.js $APP_HOME/

CMD if [ "$AT_MODE" = "TEST" ] ; then echo "TEST MODE"&&sleep infinity ; else ./wait-for-it.sh -t 0 $ES_HOST -- npm start ; fi