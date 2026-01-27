#!/bin/bash

# Open interactive shell in Docker container

docker-compose up -d
docker-compose exec anchor-dev /bin/bash
