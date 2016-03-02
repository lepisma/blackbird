# blackbird

<kbd>under development</kbd>

*Exploratory music player*

Blackbird lets you explore your [beets](http://beets.io) library in acoustic feature space.

![screen](images/screen.gif)

---

#### Setting Up

- Initialize a [beets](http://beets.io) library
- Setup `config.yaml`
- Modify `beets` config file to include blackbird plugin

  ```yaml
  pluginpath:
    - <path to ./utils/beetsplug>
  plugins: blackbird
  blackbird:
    db: <path to store db>
    seq_features: <path to store sequential features>
    lstm:
      arch: <architecture file (yaml) for lstm model>
      weights: <trained weights file>
      output: <layer number to tap output from>
  ```
- Install dependencies

  ```shell
  npm install
  pip install -r requirements.txt
  ```
- You might need to rebuild `sqlite3` and `zerorpc`. See [here](http://electron.atom.io/docs/latest/tutorial/using-native-node-modules/).
- Compile sass `npm run build`
- Initialize databases and files

  ```shell
  cd ./utils
  python reset.py
  ```
- `beets` imports will automatically put songs in blackbird database. Following commands are added to `beets`.

  ```shell
  # Generate sequential features for given query
  beet features

  # Generate coordinates from the sequential features using specified method
  beet coords --type [mean, lstm]
  ```
- Start with `npm start`

##### Downloading Music

- Run downloader process
  
  ```shell
  cd ./utils
  python downloader.py
  ```
- Open Youtube frame (top left button)
- Navigate to music and enter `d`
- Confirm metadata and press return (needs [ffmpeg](https://www.ffmpeg.org/) to save mp3)

##### Music Features

MFCC coefficients of size (20, N) are generated when `beet features` is called. N depends on length of song, block_reduced (mean) using a block of size (1, 100).

When `beet coords` is called with `mean` option, a clipped mean vector of size 20 is used as representation of each song. With `lstm` option, a keras lstm encoder-decoder model is loaded and resulting middle vector is used as representation. Both cases use TSNE to reduce the 20 vector to 2 and provide coordinates for visualization. Lookout for training notebook and pre-trained models in `./utils`.

##### Commands

- `a` / `artist` → *Artist mode*

  View songs by artist of current song
  
- `am` / `album` → *Album mode*

  View songs from album of current song
  
- `s <term>` / `search <term>` → *Search mode*

  Filter using search query. `_space_` in query is intersection, `+` is union, `-` is except
  
- `f` / `free` → *Free mode*. View all items
- `sim` / `similar` → Sort in-mode according to similarity with current song
- `cap <n>` / `artistcap <n>` → Filter artists with less than `n` songs
- `n <n>` / `new <n>` → `n` recent imports
- `r` / `repeat` → Toggle repeat
- `slp <n>` / `sleep <n>` → Sleep after playing `n` songs. Set negative `n` for reset
- `l` / `love` → Mark songs as loved in last.fm
- `d` / `download` → Download music from youtube

##### Shortcuts

- <kbd>ctrl+alt+\<right\></kbd> → Next song
- <kbd>ctrl+alt+\<left\></kbd> → Previous song
- <kbd>ctrl+alt+\<space\></kbd> → Play/pause
- <kbd>ctrl+alt+\<down\></kbd> → Hide to tray
- <kbd>ctrl+alt+\<up\></kbd> → Pop to front
- <kbd>alt+x</kbd> → Enter command (while window active)
- <kbd>ctrl+w</kbd> → Exit

##### Others

There is an emacs package for reading lyrics of current song (`./utils/blackbird.el`).

##### Bugs / Issues

blackbird is under development and therefore has crappy code structure and documentation. Feature addition/removal (and occasional refactoring) keeps happening. Please file issue [here](https://github.com/lepisma/blackbird/issues).
