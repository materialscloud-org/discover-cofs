### Dockerfile for COF discover section
# Based on https://github.com/materialscloud-org/tools-barebone/Dockerfile
# See http://phusion.github.io/baseimage-docker/ for info in phusion
# See https://hub.docker.com/r/phusion/passenger-customizable
# for the latest releases
FROM phusion/passenger-customizable:1.0.1

MAINTAINER Leopold Talirz <leopold.talirz@gmail.com>

# If you're using the 'customizable' variant, you need to explicitly opt-in
# for features. Uncomment the features you want:
#
#   Build system and git.
RUN /pd_build/utilities.sh && \
    /pd_build/python.sh

### Installation
RUN apt-get update \
    && apt-get -y install \
    apache2 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean all

# Setup apache
# enable wsgi module, disable default apache site, enable our site
ADD ./.apache/apache-site.conf /etc/apache2/sites-available/app.conf
RUN a2enmod wsgi && \
    a2dissite 000-default && a2ensite app

# Activate apache at startup
RUN mkdir /etc/service/apache
RUN mkdir /var/run/apache2
ADD ./.apache/apache_run.sh /etc/service/apache/run

# Run this as root to replace the version of pip
RUN pip install --upgrade pip setuptools wheel

# from now on run as user app, provided by passenger
USER app
ENV HOME /home/app
WORKDIR /home/app

# Add wsgi file for app
COPY ./.apache/app.wsgi app.wsgi

# Install jsmol
RUN wget https://sourceforge.net/projects/jmol/files/Jmol/Version%2014.29/Jmol%2014.29.22/Jmol-14.29.22-binary.zip/download --output-document jmol.zip
RUN unzip jmol.zip && cd jmol-14.29.22 && unzip jsmol.zip

# Install jsmol bokeh extension
RUN git clone https://github.com/ltalirz/jsmol-bokeh-extension.git
RUN apt-get update && apt-get install -y --no-install-recommends nodejs
# adds to global PYTHONPATH
RUN echo "/project/jsmol-bokeh-extension" >> /usr/local/lib/python2.7/dist-packages/site-packages.pth

# Copy bokeh app
WORKDIR /home/app/discover-cofs
COPY figure ./figure
COPY detail ./detail
COPY select-figure ./select-figure
RUN ln -s /project/jmol-14.29.22/jsmol ./detail/static/jsmol
COPY setup.py import_db.py ./
RUN pip install --user -e . --no-warn-script-location
COPY serve-app.sh ./


# go back to root user for startup
USER root
RUN chown -R app:app /home/app

# run apache server (using baseimage-docker's init system)
EXPOSE 80
CMD ["/sbin/my_init"]

# start bokeh server
CMD ["/opt/serve-app.sh"]

#EOF
