"""
Script for scanning music directory
"""

import sqlite3
import eyed3
import pyprind
import os
import cPickle
import sys
from numpy.random import normal as random


if len(sys.argv) != 2:
    print("Error in usage")
    print("use: python scan.py <directory>")
    sys.exit(1)

db_file = "../base/data.db"

# Currently performs a hard scan and library reset
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
# load features
files = cPickle.load(open("../notebook/features.pkl"))["files"]
coords = cPickle.load(open("../notebook/tsne.pkl"))[1]

for idx, song in enumerate(songs):
    try:
        audio_data = eyed3.load(song)
        song_idx = files.index(song)
        songs_data.append((idx,
                           audio_data.tag.title,
                           audio_data.tag.artist,
                           audio_data.tag.album,
                           song,
                           coords[song_idx][0],
                           coords[song_idx][1]))
    except Exception as e:
        print e
        sys.exit(1)
    bar.update()

cur.executemany("INSERT INTO songs VALUES (?, ?, ?, ?, ?, ?, ?)", songs_data)

conn.commit()
conn.close()
