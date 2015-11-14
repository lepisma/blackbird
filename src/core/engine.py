"""
Listing provider
"""

import dataset
import numpy as np
import json
import threading
import cPickle
from sklearn import preprocessing

# import addins
from addins import lastfm

class engine:
    """
    Provides listing with unique shuffling
    """

    def __init__(self):
        # Load database
        global_config = json.load(open("core/config.json"))["global"]
        self.db_path = global_config["db_path"]
        self.media_root = global_config["media_root"]

        self.db = dataset.connect("sqlite:///core/" + self.db_path)
        self.table = self.db["songs"]

        self.features = cPickle.load(open("core/" + global_config["features_file"], "r"))
        # get songs with no features
        self.no_features = []
        for i in xrange(len(self.features)):
            if np.sum(np.absolute(self.features[i])) == 0:
                self.no_features.append(i)

        self.features = preprocessing.scale(self.features)

        # Get count
        self.count = self.table.count()

        # Make a random non repeating sequence
        self.random_seq = np.arange(self.count)
        np.random.shuffle(self.random_seq)

        # Other sequences to be generated on the fly
        self.search_seq = []
        self.artist_seq = []
        self.album_seq = []
        self.similar_seq = []

        # Set current sequence as random
        self.sequence = self.random_seq
        self.seq_count = len(self.sequence)

        # Initialize state
        self.current = 0
        self.currentData = {}
        self.repeat = False
        self.saved_state = {"saved": False, "value": 0}

        # Set sleep after
        self.sleep = None

        # Init scrobbler
        try:
            self.scrobbler = lastfm.Scrobbler()
            self.scrobbler_enabled = True
        except:
            self.scrobbler_enabled = False

    def get_song(self, seq_id):
        """
        Get song from current sequence and given seq_id
        """

        seq_id = int(seq_id)
        result = self.table.find_one(id=seq_id)

        song = {
            "title": result["title"],
            "artist": result["artist"],
            "album": result["album"],
            "path": self.media_root + result["path"].replace("\\", "/")
        }

        return song

    def next(self):
        """
        Return next song to play
        """

        # Check for sleep (only in forward mode)
        if self.sleep is not None:
            if self.sleep <= 0:
                return "nf"

        # Check if repeat is on
        if self.repeat and self.currentData:
            return self.currentData

        # Change state
        self.current += 1
        self.current %= self.seq_count

        self.currentData = self.get_song(self.sequence[self.current] + 1)

        if self.scrobbler_enabled:
            # Update now playing
            sct = threading.Thread(
                target=self.scrobbler.update_now_playing,
                args=(self.currentData["title"], self.currentData["artist"])
            )

            sct.start()

        return self.currentData

    def previous(self):
        """
        Return previous song
        """

        # Check if repeat is on
        if self.repeat and self.currentData:
            return self.currentData

        # Change state
        self.current -= 1
        if self.current < 0:
            self.current += self.seq_count

        self.currentData = self.get_song(self.sequence[self.current] + 1)

        if self.scrobbler_enabled:
            # Update now playing
            sct = threading.Thread(
                target=self.scrobbler.update_now_playing,
                args=(self.currentData["title"], self.currentData["artist"])
            )

            sct.start()

        return self.currentData

    def execute(self, command):
        """
        Run given command
        """

        if len(command.split()) == 0:
            return "nf"

        action = command.split()[0]
        args = command.split()[1:]
        argsall = " ".join(args)

        # handling repeat
        if action in ["repeat", "r"]:
            self.repeat = not self.repeat
            return "done"

        elif action in ["artist", "a"]:
            # Create artist sequence
            # Save main loop state
            if self.saved_state["saved"] == False:
                self.saved_state["value"] = self.current
                self.saved_state["saved"] = True

            # Find same artist
            results = self.table.find(artist=self.currentData["artist"])

            self.artist_seq = []
            for result in results:
                self.artist_seq.append(result["id"] - 1)

            self.seq_count = len(self.artist_seq)

            # Shifting main sequence
            np.random.shuffle(self.artist_seq)
            self.sequence = self.artist_seq
            self.current = 0

            return "artist"

        elif action in ["album", "am"]:
            # Create album sequence
            # Save main loop state
            if self.saved_state["saved"] == False:
                self.saved_state["value"] = self.current
                self.saved_state["saved"] = True

            # Find same album
            results = self.table.find(album=self.currentData["album"])

            self.album_seq = []
            for result in results:
                self.album_seq.append(result["id"] - 1)

            self.seq_count = len(self.album_seq)

            # Shifting main sequence
            np.random.shuffle(self.album_seq)
            self.sequence = self.album_seq
            self.current = 0

            return "album"

        elif action in ["free", "f"]:
            # Go to main sequence
            self.sequence = self.random_seq
            self.seq_count = len(self.sequence)
            self.current = self.saved_state["value"]
            self.saved_state["saved"] = False

            return "free"

        elif action in ["search", "s"]:
            # Basic loop search

            # Save main loop state
            if self.saved_state["saved"] == False:
                self.saved_state["value"] = self.current
                self.saved_state["saved"] = True

            # Checking out using simple loop
            results = self.db.query("SELECT id, artist, album, title FROM songs")

            self.search_seq = []

            for result in results:
                text = result["artist"] + result["album"] + result["title"]
                text = text.encode("ascii", "ignore")
                if argsall in text.lower():
                    self.search_seq.append(result["id"] - 1)

            if len(self.search_seq) == 0:
                return "nf"

            # Shifting main sequence
            np.random.shuffle(self.search_seq)
            self.sequence = self.search_seq
            self.seq_count = len(self.sequence)
            self.current = 0

            return "search"

        elif action in ["similar", "sim"]:
            # Similar tracks

            # Check if no features present
            if self.sequence[self.current] in self.no_features:
                return "nf"

            # Save main loop state
            if self.saved_state["saved"] == False:
                self.saved_state["value"] = self.current
                self.saved_state["saved"] = True

            # Getting top similar tracks
            dists = []
            for i in xrange(self.count):
                dists.append(np.linalg.norm(self.features[self.sequence[self.current], :] - self.features[i]))


            self.similar_seq = np.argsort(dists)

            # Shifting main sequence
            self.seq_count = len(self.similar_seq)
            self.sequence = self.similar_seq
            self.current = 0

            return "similar"

        elif action in ["love", "l"]:
            # Love track

            if not self.scrobbler_enabled:
                return "nf"

            if self.currentData:
                self.scrobbler.love(self.currentData["title"], self.currentData["artist"])
                return "done"
            else:
                return "nf"

        elif action in ["sleep", "slp"]:
            # Sleep after given plays

            try:
                sleep_count = int(args[0])
                if sleep_count < 1:
                    # Reset sleep value
                    self.sleep = None
                else:
                    self.sleep = sleep_count
            except:
                return "nf"
            return "done"

        return "nf"

    def played(self):
        """
        Run tasks after the song is marked played
        """

        # Scrobble
        if self.scrobbler_enabled:
            self.scrobbler.scrobble(self.currentData["title"], self.currentData["artist"])

        # Handle sleep
        if self.sleep is not None:
            self.sleep -= 1
