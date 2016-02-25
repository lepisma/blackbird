"""
Feature extractor functions
"""

import librosa
import numpy as np
import theano
from keras.models import model_from_yaml
from keras import backend as K


def random(vector_size=20, lb=-1, ub=1):
    """
    Return a random vector of given size
    """

    return np.random.uniform(low=lb, high=ub, size=(vector_size))


def mfcc(song_path, vector_size=20):
    """
    Return mean of MFCC coefficients
    """

    y, sr = librosa.load(song_path)
    data = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=vector_size)
    clip = int(data.shape[1] * 0.1)
    data = data[:, clip:data.shape[1]-clip]
    return data.mean(axis=1)


class LSTMSeq2Seq(object):
    """
    Use Seq2Seq autoencoder to generate feature vector from sequences.
    """

    def __init__(self, architecture_file, weights_file, output_layer):
        """
        Initialize model
        """

        self.model = model_from_yaml(open(architecture_file).read())
        self.model.load_weights(weights_file)

        # Output function
        self.predict = K.function([self.model.layers[0].input],
                                  [self.model.layers[output_layer].get_output(train=False)])

