"""
Port data from mediamonkey to biz
"""

import sqlite3
import json
import os


# Load mediamonkey data
mm_db = json.load(open("../config.json"))["utils"]["mediamonkey"]["db_path"]
biz_db = json.load(open("../config.json"))["global"]["db_path"]

conn = sqlite3.connect(mm_db)
cursor = conn.cursor()

# Selecting all MP3s
cursor.execute("SELECT Artist, Album, SongTitle, SongPath, Year, Genre from Songs WHERE Extension='MP3'")

data = cursor.fetchall()
count = len(data)

conn.close()

# Save data
try:
    os.remove("../" + biz_db)
except OSError:
    pass

conn = sqlite3.connect("../" + biz_db)
cursor = conn.cursor()

cursor.execute("CREATE TABLE songs (id INTEGER PRIMARY KEY, title TEXT, artist TEXT, album TEXT, path TEXT, year INT, genre TEXT)")

cursor.executemany("INSERT INTO songs (artist, album, title, path, year, genre) VALUES (?, ?, ?, ?, ?, ?)", data)
conn.commit()

# Clearing podcasts
cursor.execute("DELETE FROM songs WHERE Genre='Podcast'")
conn.commit()

conn.close()
