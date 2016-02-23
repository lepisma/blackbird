"""
Script for scanning music directory and generating random coordinates
"""

import sqlite3
import eyed3
import pyprind
import os
import cPickle
import sys
from numpy.random import normal as random
import yaml

config = yaml.load(open("../config.yaml").read())

if len(sys.argv) != 2:
    print("Error in usage")
    print("use: python scan.py <directory>")
    sys.exit(1)

db_file = config["db"]

# Performs a hard scan and library reset

try:
    os.remove(db_file)
except OSError:
    pass

conn = sqlite3.connect(db_file)
cur = conn.cursor()

to_scan = unicode(sys.argv[1])
songs = []

for root, _, files in os.walk(to_scan):
    for filename in files:
        if filename.endswith(".mp3"):
            songs.append(os.path.join(root, filename))

print("Reading data...")

bar = pyprind.ProgBar(len(songs))

cmd = "CREATE TABLE songs (id INTEGER PRIMARY KEY, title TEXT, artist TEXT, album TEXT, path TEXT, x FLOAT, y FLOAT)"
cur.execute(cmd)

songs_data = []

for idx, song in enumerate(songs):
    try:
        audio_data = eyed3.load(song)
        songs_data.append((idx,
                           audio_data.tag.title,
                           audio_data.tag.artist,
                           audio_data.tag.album,
                           song,
                           random(),
                           random()))
    except Exception as e:
        print e
        sys.exit(1)
    bar.update()

cur.executemany("INSERT INTO songs VALUES (?, ?, ?, ?, ?, ?, ?)", songs_data)

conn.commit()
conn.close()
