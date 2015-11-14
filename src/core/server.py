"""
Server process
"""

from flask import Flask, request
from flask.ext.cors import CORS
import json

# Import engines
import engine
eng = engine.engine()

app = Flask(__name__)
cors = CORS(app)


# Routes
@app.route("/next")
def next():
    """
    Next song
    """

    return json.dumps(eng.next())

@app.route("/prev")
def prev():
    """
    Previous song
    """

    return json.dumps(eng.previous())

@app.route("/played")
def played_trigger():
    """
    Run post play tasks
    """

    return eng.played()

@app.route("/command")
def command():
    """
    Pass commands to engine
    """

    command = request.args.get("command")
    return eng.execute(command)

# Run main process
if __name__ == '__main__':
    app.run(threaded=True)
