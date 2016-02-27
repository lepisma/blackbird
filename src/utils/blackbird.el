;;; blackbird.el --- Basic interactions with blackbird in emacs (https://github.com/lepisma/blackbird)

;;; Abhinav Tushar
;;; Lyrics feature forked from emms-get-lyrics.el

(require 'request)

(defun blackbird-read-lyrics ()
  "Return details about current song"
  (interactive)
  (request
    "http://localhost:1234/current"
    :parser 'json-read
    :timeout 5
    :success (function*
              (lambda (&key data &allow-other-keys)
                (let* ((title (assoc-default 'title data))
                       (artist (assoc-default 'artist data)))
                  (blackbird-lyrics artist title))))))

(defun blackbird-lyrics-mode ()
  "Major mode for displaying lyrics."
  (interactive)
  (kill-all-local-variables)
  (setq major-mode 'blackbird-lyrics-mode)
  (setq mode-name "Lyrics")
  (setq buffer-read-only t)
  (run-hooks 'blacbird-lyrics-mode-hook))

(defun blackbird-lyrics-url (artist title)
  (concat
   "http://www.google.com/search?btnI&q=" (base64-decode-string "c2l0ZTplbHlyaWNzLm5ldCs=")
   (replace-regexp-in-string
    " " "+"
    (concat
     artist
     " "
     title ""))
   ""))

(defun blackbird-lyrics-w3m (url buffer)
  (call-process "w3m" nil buffer nil "-dump" url))

(defun blackbird-lyrics (artist title)
  "Display lyrics for given song"
  (let ((bname (concat "Lyrics: " title " by " artist)))
    (cond ((get-buffer bname)
           (switch-to-buffer bname))
          (t
           (let ((buffer (get-buffer-create bname)))
             (set-buffer buffer)
             (blackbird-lyrics-w3m (blackbird-lyrics-url artist title) buffer)
             (goto-char (point-min))
             (if (and
                  (search-forward "Rating" nil t)
                  (not (search-forward "No results." nil t)))
                 (let ((frominsert ""))
                   (forward-line 22)
                   (delete-region (point-min) (1+ (line-end-position)))
                   (goto-char (point-max))
                   (if (search-backward "Correct these lyrics" nil t)
                       (progn (beginning-of-line)(forward-line -1)(delete-region (point) (point-max)))))
               (delete-region (point-min) (point-max))
               (insert "Unable to find lyrics for " title " by " artist))

             (goto-char (point-min))
             (blackbird-lyrics-mode)
             (switch-to-buffer buffer)
             (goto-char (point-min)))))))

(provide 'blackbird)
