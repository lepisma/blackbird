"""
Common database functions
"""

import sqlite3
import os


def reset(file_path, features=False):
    """
    Create the database if not present.
    If present, clean up the coords and (optionally) features
    """

    if os.path.isfile(file_path):
        conn = sqlite3.connect(file_path)
        cur = conn.cursor()
        cur.execute("DELETE FROM coords")

        if features:
            cur.execute("DELETE FROM features")

        conn.commit()
        conn.close()
    else:
        conn = sqlite3.connect(file_path)
        cur = conn.cursor()

        cur.execute("CREATE TABLE coords (id INTEGER PRIMARY KEY, x REAL, y REAL)")
        cur.execute("CREATE TABLE features (id INTEGER PRIMARY KEY, feature BLOB)")

        conn.commit()
        conn.close()
