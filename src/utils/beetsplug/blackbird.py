"""
Module for pipelining media management from beets to blackbird
"""

from beets.plugins import BeetsPlugin
from beets import config
import sqlite3
from numpy.random import normal as random


class Blackbird(BeetsPlugin):
    """
    Plugin for blackbird
    """

    def __init__(self):
        super(Blackbird, self).__init__()
        self.register_listener("import", self.db_change)

    def db_change(self, lib):
        self.register_listener("cli_exit", self.update_coordinates)

    def update_coordinates(self, lib):
        """
        Update coordinates in blackbird database after beets db change
        """

        conn = sqlite3.connect(config["blackbird"]["db"].get("unicode"))
        cur = conn.cursor()
        cur.execute("SELECT id FROM coords")
        data = cur.fetchall()
        data = [x[0] for x in data]

        to_write = []
        for item in lib.items():
            if item.id not in data:
                to_write.append((item.id,
                                 random(),
                                 random()))

        cur.executemany("INSERT INTO coords VALUES (?, ?, ?)", to_write)
        conn.commit()
        conn.close()
