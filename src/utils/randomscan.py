"""
Script for scanning music directory and generating random coordinates
"""

import sqlite3
import eyed3
import pyprind
import os
import cPickle
from numpy.random import normal as random
import yaml
from setupdb import reset

config = yaml.load(open("../config.yaml").read())

beets_db_file = config["beets_db"]
blackbird_db_file = config["blackbird_db"]

# Reset db
reset(blackbird_db_file, features=True)


# Read ids
conn = sqlite3.connect(beets_db_file)
cur = conn.cursor()
cur.execute("SELECT id FROM items")
data = cur.fetchall()
conn.close()

# Write random data
coords_data = []
for idx in xrange(len(data)):
    coords_data.append((data[idx][0],
                        random(),
                        random()))

conn = sqlite3.connect(blackbird_db_file)
cur = conn.cursor()
cur.executemany("INSERT INTO coords VALUES (?, ?, ?)", coords_data)
conn.commit()
conn.close()
