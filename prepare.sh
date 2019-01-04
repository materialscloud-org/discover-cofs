#!/bin/bash
# This scripts builds the database from the Materials Cloud Archive entry

cd data/

# Download data
export base_url=http://archive.materialscloud.org/file/2018.0003/v2; \
    wget ${base_url}/properties.tgz

# Extract data
tar xf properties.tgz && rm properties.tgz

cd ..

# Create sqlite DB
python import_db.py

# Upload db to object store
#cd data
#openstack object create discover-cofs database.db


## Download structures
#export base_url=http://archive.materialscloud.org/file/2018.0003/v2; \
#    wget ${base_url}/structures.tgz &&\
#    wget ${base_url}/properties.tgz
#
