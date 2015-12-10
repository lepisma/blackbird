"""
Script for scanning music directory
"""

import sqlite3
import eyed3
import pyprind
import os
import sys
from random import random


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

for idx, song in enumerate(songs):
    try:
        audio_data = eyed3.load(song)
    except:
        print song
        sys.exit(1)
    songs_data.append((idx,
                       audio_data.tag.title,
                       audio_data.tag.artist,
                       audio_data.tag.album,
                       song,
                       random(),
                       random()))
    bar.update()

cur.executemany("INSERT INTO songs VALUES (?, ?, ?, ?, ?, ?, ?)", songs_data)

conn.commit()
conn.close()
