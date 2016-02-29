"""
Common database functions
"""

import sqlite3
import os


def reset(file_path):
    """
    Create the database if not present.
    If present, clean it up
    """

    if os.path.isfile(file_path):
        conn = sqlite3.connect(file_path)
        cur = conn.cursor()
        cur.execute("DELETE FROM coords")
        conn.commit()
        conn.close()
    else:
        conn = sqlite3.connect(file_path)
        cur = conn.cursor()
        cur.execute("CREATE TABLE coords (id INTEGER PRIMARY KEY, x REAL, y REAL)")
        conn.commit()
        conn.close()
