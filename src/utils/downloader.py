"""
Music downloader module
"""

from __future__ import unicode_literals
import eyed3
import zerorpc
import subprocess
import os
import yaml

config = yaml.load(open("../config.yaml").read())

class YtDownloader(object):
    """
    Download music from youtube
    """

    def __init__(self, save_dir):
        self.save_dir = save_dir

    def save(self, url, metadata):
        filename = metadata["artist"] + "-" + metadata["title"]
        # absolute filename
        filename = os.path.join(self.save_dir, filename)
        command = "youtube-dl -x --audio-format mp3 --audio-quality 0 --no-playlist "
        command += '--output "' + filename + '.%(ext)s"'

        retcode = subprocess.call(command + " " + url)

        if retcode == 1:
            return "err"
        else:
            # Write Metadata to file
            print("Writing metadata...")
            song = eyed3.load(filename + ".mp3")
            song.tag.artist = unicode(metadata["artist"])
            song.tag.title = unicode(metadata["title"])
            song.tag.save()
            return "ok"

s = zerorpc.Server(YtDownloader(config["download_dir"]))
s.bind("tcp://0.0.0.0:" + config["rpc_port"])
s.run()
