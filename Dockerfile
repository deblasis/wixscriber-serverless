# To enable ssh & remote debugging on app service change the base image to the one below
# FROM mcr.microsoft.com/azure-functions/node:3.0-appservice
FROM lsiobase/ffmpeg:bin as binstage
FROM mcr.microsoft.com/azure-functions/node:3.0-node12-slim

COPY --from=binstage / /

ENV \
 LIBVA_DRIVERS_PATH="/usr/lib/x86_64-linux-gnu/dri" \
 NVIDIA_DRIVER_CAPABILITIES="compute,video,utility" \
 NVIDIA_VISIBLE_DEVICES="all"

RUN \
 echo "**** install ffmpg runtime ****" && \
 apt-get update && \
 apt-get install -y \
	i965-va-driver \
	libexpat1 \
	libgl1-mesa-dri \
	libglib2.0-0 \
	libgomp1 \
	libharfbuzz0b \
	libv4l-0 \
	libx11-6 \
	libxcb1 \
	libxcb-shape0 \
	libxcb-xfixes0 \
	libxext6 \
	libxml2 \
    s6 \
	ocl-icd-libopencl1 && \
 echo "**** clean up ****" && \
 rm -rf \
	/var/lib/apt/lists/* \
	/var/tmp/*

COPY /root /

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

COPY . /home/site/wwwroot

RUN cd /home/site/wwwroot && \
    npm install