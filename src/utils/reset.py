"""
Setup database and other files
"""

import sqlite3
import os
import yaml
import cPickle
import time


config = yaml.load(open("../config.yaml").read())
beets_config = yaml.load(open(config["beets_config"]).read())


db = config["blackbird_db"]
# Reset database
if os.path.isfile(db):
    # Create backup
    os.rename(db, db + ".backup." + str(time.time()))

conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute("CREATE TABLE coords (id INTEGER PRIMARY KEY, x REAL, y REAL)")
conn.commit()
conn.close()

features = beets_config["blackbird"]["seq_features"]
# Reset feature base
if os.path.isfile(features):
    # Create backup
    os.rename(features, features + ".backup." + str(time.time()))

cPickle.dump({}, open(features, "wb"), cPickle.HIGHEST_PROTOCOL)
