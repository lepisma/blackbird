# blackbird

<kbd>under development</kbd>

*Exploratory music player*

![screen](images/screen.gif)

---

#### Running

```shell
# Install deps
cd ./src
npm install
pip install requirements.txt

# Compile sass
sass --update ./app/styles

# Setup config.yaml

# Use `./utils/randomscan.py` to scan music
# and arrange items randomly in the space

cd ./utils
python randomscan.py <musicdir>

npm start
```

##### Commands

- `a` / `artist` → *Artist mode*. View songs by current [song] artist
- `am` / `album` → *Album mode*. View songs from current [song] album
- `s <term>` / `search <term>` → *Search mode*. View items with term in name/artist/album
- `f` / `free` → *Free mode*. View all items
- `sim` / `similar` → Sort in-mode according to similarity with current song
- `r` / `repeat` → Toggle repeat
- `slp <n>` / `sleep <n>` → Sleep after playing `n` songs
- `l` / `love` → Mark songs as loved in last.fm
- `d` / `download` → Download music from youtube

##### Downloading Music

- Run downloader process `python ./src/utils/downloader.py/`
- Open Youtube frame (top left button)
- Navigate to music and enter `d`
- Confirm metadata and enter `d y` to save mp3 (needs ffmpeg)

##### Shortcuts

- <kbd>ctrl+alt+\<right\></kbd> → Next song
- <kbd>ctrl+alt+\<left\></kbd> → Previous song
- <kbd>ctrl+alt+\<space\></kbd> → Play/pause
- <kbd>ctrl+alt+\<down\></kbd> → Hide to tray
- <kbd>ctrl+alt+\<up\></kbd> → Pop to front
- <kbd>alt+x</kbd> → Enter command (while window active)

#### Todos

- Shift media management to [beets](beets.io)
- Feature generation plugins (MFCCs, autoencoders)
