"""
Module for pipelining media management from beets to blackbird
"""

from beets.plugins import BeetsPlugin
from beets.ui import Subcommand, decargs
from beets import config
import sqlite3
import pyprind
import librosa
import cPickle
import numpy as np
from skimage.measure import block_reduce
import sys
from sklearn.manifold import TSNE


class Blackbird(BeetsPlugin):
    """
    Plugin for blackbird
    """

    def __init__(self):
        super(Blackbird, self).__init__()
        self.register_listener("import", self.db_change)

    def fill(self, ids, lb, ub):
        """
        Fill random coords in table
        """

        conn = sqlite3.connect(config["blackbird"]["db"].get("unicode"))
        cur = conn.cursor()

        print("Filling random values for " + str(len(ids)) + " songs")
        to_insert = []
        for idx in xrange(len(ids)):
            to_insert.append((ids[idx],
                              np.random.uniform(low=lb[0], high=ub[0]),
                              np.random.uniform(low=lb[1], high=ub[1])))
        cur.executemany("INSERT INTO coords VALUES (?, ?, ?)", to_insert)
        conn.commit()
        conn.close()


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

            print("Saving data...")
            cPickle.dump(features, open(features_file, "wb"), protocol=cPickle.HIGHEST_PROTOCOL)

        # Import features as coordinates
        coords_cmd = Subcommand("coords",
                                help="Generate coordinates based on calculated features [blackbird]")
        coords_cmd.parser.add_option("-t",
                                     "--type",
                                     help="Type of vectorization [mean (default), lstm]")

        def coords_func(lib, opts, args):
            if opts.type:
                if opts.type != "mean":
                    print("Only mean method supported")
            else:
                features_file = config["blackbird"]["seq_features"].get("unicode")
                features = cPickle.load(open(features_file, "rb"))

                keys = np.empty(len(features))
                mean_features = np.empty((len(features), 20))

                for idx, key in enumerate(features):
                    length = features[key].shape[1]
                    mean_features[idx, :] = features[key][:, int(0.1 * length):int(0.9 * length)].mean(axis=1)
                    keys[idx] = key

                print("Reducing dimensions...")
                mean_features_2d = TSNE(n_components=2).fit_transform(mean_features)

                print("Writing to db...")
                conn = sqlite3.connect(config["blackbird"]["db"].get("unicode"))
                cur = conn.cursor()
                cur.execute("DELETE FROM coords")

                to_insert = []
                for idx in xrange(mean_features_2d.shape[0]):
                    to_insert.append((keys[idx],
                                      mean_features_2d[idx, 0],
                                      mean_features_2d[idx, 1]))
                cur.executemany("INSERT INTO coords VALUES (?, ?, ?)", to_insert)
                conn.commit()
                conn.close()

                # Fill leftovers
                ids_to_fill = []
                for item in lib.items():
                    if item.id not in keys:
                        ids_to_fill.append(item.id)

                self.fill(ids_to_fill, mean_features_2d.min(axis=0), mean_features_2d.max(axis=0))

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
        ids = cur.fetchall()
        ids = [x[0] for x in ids]
        conn.close()

        # Fill leftovers
        ids_to_fill = []
        for item in lib.items():
            if item.id not in ids:
                ids_to_fill.append(item.id)

        self.fill(ids_to_fill, [0, 0], [1, 1])
