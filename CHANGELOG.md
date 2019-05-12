# Change Log

## 0.0.6 (12-05-2019)

- Fixed: language configuration: account for uppercase/lowercase if/for blocks (#15).
- Fixed: Refactor GenStat runner to use exec (fixes problems with passing arguments with double quotes).
- Added: Include configuration settings for line length of genstat commands and result lines of genstat outputs.
- Added: functionality to switch to output option and change keybinding for switching between source and output to alt+n (#16).
- Added: functionality to copy table in output as semicolon delimited string (#7).

## 0.0.5 (29-04-2019)

- Fixed: link Biometris help links.
- Fixed: correct auto-indentation for if/for blocks (#5).
- Fixed: switch from GenStat output to source now also works in single-editor mode.
- Added: syntax highlighting for GenStat output files (.lis files) (#6).
- Changed: classify GenStat keywords as functions for syntax highlighting.
- Changed: clear already existing .lis output files before running GenStat scripts (#13).
- Changed: show message-box on running GenStat and allow for aborting jobs.

## 0.0.4 (26-04-2019)

- Added: genstat output file language definition and association with .lis files.
- Added: switch command to quickly switch from genstat output file to source file.
- Added: open help for Biometris AddIn commands.
- Added: association of .ex and .pro files with genstat source files.
- Added: extension logo.
- Changed: change focus of editor to genstat output when run complete.

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
