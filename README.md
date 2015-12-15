# blackbird

<kbd>under development</kbd>

Music player

![screen](screen.gif)

---

#### Implemented features

##### Basic Interface

- Filters based on:
  - Artist
  - Album
  - Search term
- Similarity sorting
- Repeat
- Sleep After
  
#### Todos

- Learn vector representation of songs.
  - Use `lastfm` listen sessions (listens in one go) to get joint preference information for songs.
  - Learn a siamese LSTM network (waiting for a good GPU) on song spectrum to generate vectors complying with preferences. Hopefully, this should capture both, my personal biases and acoustic features.
