"""
Module for pipelining media management from beets to blackbird
"""

from beets.plugins import BeetsPlugin
from beets.ui import Subcommand, decargs
from beets import config
import sqlite3
import pyprind
import cPickle
import numpy as np
from skimage.measure import block_reduce
import sys
from sklearn.manifold import TSNE
from keras.preprocessing import sequence
import librosa


class LSTMSeq2Seq(object):
    """
    Use Seq2Seq autoencoder to generate feature vector from sequences.
    """

    def __init__(self, architecture_file, weights_file, output_layer):
        """
        Initialize model
        """

        # Deferred import
        from keras.models import model_from_yaml
        from keras import backend as K

        self.model = model_from_yaml(open(architecture_file).read())
        self.model.load_weights(weights_file)

        # Output function
        self.predict = K.function(
            [self.model.layers[0].input, K.learning_phase()],
            self.model.layers[output_layer].output)


class Blackbird(BeetsPlugin):
    """
    Plugin for blackbird
    """

    def __init__(self):
        super(Blackbird, self).__init__()
        self.register_listener("import", self.db_import)
        self.register_listener("item_removed", self.db_remove)

    def fill(self, ids, lb, ub):
        """
        Fill random coords in table
        """

        conn = sqlite3.connect(config["blackbird"]["db"].get("unicode"))
        cur = conn.cursor()

        print("Filling random values for " + str(len(ids)) + " songs")
        to_insert = []
        for idx in xrange(len(ids)):
            to_insert.append((ids[idx], np.random.uniform(low=lb[0],
                                                          high=ub[0]),
                              np.random.uniform(low=lb[1],
                                                high=ub[1])))
        cur.executemany("INSERT INTO coords VALUES (?, ?, ?)", to_insert)
        conn.commit()
        conn.close()

    def commands(self):
        """
        Commands for generating and importing features
        """

        def get_mfcc(song):
            y, sr = librosa.load(unicode(song, "utf-8"))
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20)
            return block_reduce(mfcc, (1, 100), np.mean)

        # Generate sequential features
        features_cmd = Subcommand(
            "features",
            help="Generate sequential acoustic features [blackbird]")

        def features_func(lib, opts, args):
            filtered_items = lib.items(decargs(args))

            if len(filtered_items) == 0:
                print("Query didn't match any item")
                return

            seq_features_file = config["blackbird"]["features"].get("unicode")
            seq_features = cPickle.load(open(seq_features_file, "rb"))

            print("Finding features...")
            bar = pyprind.ProgBar(len(filtered_items))
            for item in filtered_items:
                if item.id not in seq_features:
                    try:
                        data = get_mfcc(item.path)
                        seq_features[item.id] = data
                    except Exception as e:
                        print(e)
                bar.update()

            print("Saving data...")
            cPickle.dump(seq_features,
                         open(seq_features_file, "wb"),
                         protocol=cPickle.HIGHEST_PROTOCOL)

        # Import features as coordinates
        coords_cmd = Subcommand(
            "coords",
            help=
            "Generate coordinates based on calculated features [blackbird]")
        coords_cmd.parser.add_option(
            "-t",
            "--type",
            help="Type of vectorization [mean (default), lstm]")

        def coords_func(lib, opts, args):
            if opts.type:
                seq_features_file = config["blackbird"]["features"].get(
                    "unicode")
                seq_features = cPickle.load(open(seq_features_file, "rb"))

                keys = seq_features.keys()

                if opts.type == "mean":
                    features = np.empty((len(seq_features), 20))

                    for idx, key in enumerate(seq_features):
                        length = seq_features[key].shape[1]
                        features[idx, :] = seq_features[key][:, int(
                            0.1 * length):int(0.9 * length)].mean(axis=1)
                elif opts.type == "lstm":
                    print("Loading network...")
                    model = LSTMSeq2Seq(
                        config["blackbird"]["model"]["arch"].get("unicode"),
                        config["blackbird"]["model"]["weights"].get("unicode"),
                        config["blackbird"]["model"]["output"].get())
                    # Pad sequences
                    maxlen = 150
                    padded_seq_features = np.empty((len(seq_features), maxlen,
                                                    20))
                    for idx, key in enumerate(seq_features):
                        padded_seq_features[
                            idx, :, :] = sequence.pad_sequences(
                                seq_features[key],
                                maxlen=maxlen,
                                dtype="float32").T

                    print("Getting vectors...")
                    features = model.predict([padded_seq_features, 0])
                else:
                    print("Provide a valid --type [mean, lstm]")
                    sys.exit(1)

                print("Reducing dimensions...")
                features_2d = TSNE(n_components=2).fit_transform(features)

                print("Writing to db...")
                conn = sqlite3.connect(config["blackbird"]["db"].get(
                    "unicode"))
                cur = conn.cursor()
                cur.execute("DELETE FROM coords")

                to_insert = []
                for idx in xrange(features_2d.shape[0]):
                    to_insert.append((keys[idx], features_2d[idx, 0],
                                      features_2d[idx, 1]))
                cur.executemany("INSERT INTO coords VALUES (?, ?, ?)",
                                to_insert)
                conn.commit()
                conn.close()

                # Fill leftovers
                ids_to_fill = []
                for item in lib.items():
                    if item.id not in keys:
                        ids_to_fill.append(item.id)

                self.fill(ids_to_fill,
                          features_2d.min(axis=0),
                          features_2d.max(axis=0))
            else:
                print("Provide a valid --type [mean, lstm]")

        coords_cmd.func = coords_func
        features_cmd.func = features_func

        return [features_cmd, coords_cmd]

    def db_import(self, lib):
        self.register_listener("cli_exit", self.random_coords)

    def db_remove(self, item):
        self.register_listener("cli_exit", self.clean)

    def clean(self, lib):
        """
        Clean up entries not present in beets db
        """

        conn = sqlite3.connect(config["blackbird"]["db"].get("unicode"))
        cur = conn.cursor()
        cur.execute("SELECT id FROM coords")
        ids = cur.fetchall()
        ids = [x[0] for x in ids]
        beets_ids = []
        for item in lib.items():
            beets_ids.append(item.id)

        # Remove items not in beets db from blackbird db
        ids_to_remove = []
        for idx in ids:
            if idx not in beets_ids:
                ids_to_remove.append([idx])  # wrapping in list for sqlite

        print("Cleaning " + str(len(ids_to_remove)) + " entries")
        cur.executemany("DELETE FROM coords WHERE id=?", ids_to_remove)
        conn.commit()
        conn.close()

        seq_features_file = config["blackbird"]["features"].get("unicode")
        seq_features = cPickle.load(open(seq_features_file, "rb"))

        # Remove sequential data also
        for idx in ids_to_remove:
            try:
                seq_features.pop(idx[0])
            except KeyError:
                continue

        cPickle.dump(seq_features,
                     open(seq_features_file, "wb"),
                     protocol=cPickle.HIGHEST_PROTOCOL)

    def random_coords(self, lib):
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
