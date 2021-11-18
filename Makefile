#!/bin/bash

build:
	docker build --tag deblasis/wixscriber-serverless:v1.0.0 .

run:
	docker run -p 8080:80 -it deblasis/wixscriber-serverless:v1.0.0

