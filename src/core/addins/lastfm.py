"""
Last.fm integration
"""

import time
import pylast
import json


class Scrobbler(object):

    def __init__(self):
        """
        Initialize everything
        """

        config = json.load(open("core/config.json"))["addins"]["lastfm"]

        self.user = config["user"]
        self.passhash = config["passhash"]
        self.api_key = config["API_KEY"]
        self.secret = config["SECRET"]

        self.network = pylast.LastFMNetwork(
            api_key=self.api_key,
            api_secret=self.secret,
            username=self.user,
            password_hash=self.passhash
        )

    def scrobble(self, title, artist):
        self.network.scrobble(artist=artist, title=title, timestamp=int(time.time()))

    def update_now_playing(self, title, artist):
        self.network.update_now_playing(artist=artist, title=title)

    def love(self, title, artist):
        track = self.network.get_track(artist, title)
        track.love()
