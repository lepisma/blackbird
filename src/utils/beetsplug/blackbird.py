"""
Module for pipelining media management from beets to blackbird
"""

from beets.plugins import BeetsPlugin
from beets.ui import Subcommand, decargs
from beets import config
import sqlite3
from numpy.random import normal as random
import pyprind
import librosa
import cPickle
import numpy as np
from skimage.measure import block_reduce
import sys


class Blackbird(BeetsPlugin):
    """
    Plugin for blackbird
    """

    def __init__(self):
        super(Blackbird, self).__init__()
        self.register_listener("import", self.db_change)

    def commands(self):
        """
        Commands for generating and importing features
        """

        def get_mfcc(song):
            y, sr = librosa.load(song.encode(sys.getfilesystemencoding()))
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
            return block_reduce(mfcc, (1, 100), np.mean)

        # Generate sequential features
        features_cmd = Subcommand("features",
                                  help="Generate sequential acoustic features [blackbird]")

        def features_func(lib, opts, args):
            filtered_items = lib.items(decargs(args))

            if len(filtered_items) == 0:
                print("Query didn't match any item")
                return

            features_file = config["blackbird"]["seq_features"].get("unicode")
            features = cPickle.load(open(features_file, "rb"))

            print("Finding features...")
            bar = pyprind.ProgBar(len(filtered_items))
            for item in filtered_items:
                if item.id not in features:
                    try:
                        data = get_mfcc(item.path)
                        features[item.id] = data
                    except Exception as e:
                        print e
                bar.update()
            cPickle.dump(features, open(features_file, "wb"), protocol=cPickle.HIGHEST_PROTOCOL)

        # Import features as coordinates
        coords_cmd = Subcommand("coords",
                                help="Generate coordinates based on calculated features [blackbird]")
        coords_cmd.parser.add_option("-t",
                                     "--type",
                                     help="Type of vectorization [mean (default), lstm]")

        def coords_func(lib, opts, args):
            pass

        coords_cmd.func = coords_func
        features_cmd.func = features_func

        return [features_cmd, coords_cmd]

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
