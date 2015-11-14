"""
Generate MFCC features for songs in db
"""

import sqlite3
import json
import cPickle
import numpy as np
import pyprind
import librosa
from pydub import AudioSegment
from scipy.io import wavfile
import os


# Functions
def loadfile(name):
    """
    Return signal data and samplerate
    """
    
    mp3track = AudioSegment.from_mp3(name)
    mp3track.export("temp.wav", format="wav")
    samplerate, wavedata = wavfile.read("temp.wav")
    monodata = np.mean(wavedata, axis=1)
    
    return samplerate, monodata

def clipten(data):
    """
    Clip 10% of start and end data
    """
    
    n = data.shape[0]
    
    begin = 0.1 * n
    end = 0.9 * n
    
    return data[begin:end]

def findfeature(name):
    """
    Return feature for given song
    """
    
    sr, data = loadfile(name)
    cdata = clipten(data)

    mfcc = librosa.feature.mfcc(y=cdata, sr=sr, hop_length=512, n_mfcc=13)
    feats = np.mean(mfcc, axis=1)

    return feats


# Load db
biz_db = json.load(open("../config.json"))["global"]["db_path"]
media_root = json.load(open("../config.json"))["global"]["media_root"]
features_file = json.load(open("../config.json"))["global"]["features_file"]

conn = sqlite3.connect("../" + biz_db)
cursor = conn.cursor()
cursor.execute("SELECT id, path FROM songs")
data = cursor.fetchall()
conn.close()

total_songs = len(data)
all_feat = np.zeros((total_songs, 13))

bar = pyprind.ProgBar(total_songs)


for row in data:
    idx = row[0]
    song = media_root + row[1].replace("\\", "/")
    
    try:
        features = findfeature(song)
        all_feat[idx - 1] = features
    except:
        print "error"
    finally:
        bar.update()


# Remove previous one

try:
    os.remove("../" + features_file)
except OSError:
    pass

cPickle.dump(all_feat, open("../" + features_file, "w"))

# clean up

os.remove("temp.wav")
