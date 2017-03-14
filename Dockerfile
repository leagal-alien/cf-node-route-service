FROM registry.evfapp.dev/alpine-node:latest
RUN mkdir /src
WORKDIR /src
CMD node .
ADD . /src

