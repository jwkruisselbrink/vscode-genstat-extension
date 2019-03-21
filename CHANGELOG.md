# Change Log

## 0.0.3 (21-03-2019)

- Fixed: open help for lines containing a keyword only (e.g., endfor).
- Fixed: actually test for known keywords.
- Fixed: syntex highlighting of double-quoted comments covering multiple lines.
- Fixed: open help function to trace back first line and keyword of multiple line statements.

## 0.0.2 (19-03-2019)

- Changed: only open output in next tab when multiple editor tabs are available (otherwise open in same tab).
- Changed: open help file asynchronous (non-blocking) and close before opening the help on a new topic.
- Changed: update genstat and biometris keywords.
- Changed: parse keyword from beginning of active line on opening help.
- Fixed: account for lowercae keywords on opening help topics.

## 0.0.1 (17-03-2019)

- First prototype
