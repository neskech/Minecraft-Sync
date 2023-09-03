# Minecraft-Sync
-----
## A command line tool to synchronize your minecraft worlds with other players

This tool is for those who want to self host a server but rarely have a time to. 

For example, let's say a friend wants to play on your server but you're not home to host it. One possible solution to this would be for that friend to just drag and drop the server files into a singleplayer world, play on it, then drag and drop the changes back on the server before you come back. 

But... That's kind of tedious. So I made this tool to automate that. Using 'feature set 0' of this repo will allow you to run a program that automically detects when you open and close minecraft, doing all the syncing in the background. No need for manual labor!

And if there are other players on the server, the program will attempt to warn you to prevent merge conflicts

To get started run the executable in the bin/ directory (npm run build) 

# INSTALLATION GUIDE: 
-------------------
1. Clone git repo, click on the clone button use https or SSH, either work. 
---------------------------------------------------------------------------
```console
git clone https://github.com/neskech/Minecraft-Sync.git 
```
## or 

```console
git clone git@github.com:neskech/Minecraft-Sync.git 
```

2. Run this command in order to set the configuration of the application, please do every command besides ServerDirectory. Unless you are hosting a server. 
```console 
./bin/index -f 2 -h
```

3. Explanation of feature sets: 
  Use this command to get a brief overview of the application 
  ```console
  ./bin/index -H 
  ```
  What each command does: 
  
    ## watcher (0)
    - Detects when you're on Minecraft, downloads from the cloud if needed, automatically retrieves your changes, and uploads them to the git. 

    ## watcher (1)
    - Manual uploading and downloading. 

    ## watcher (2)
    - Sets configuration data, this must be done first before using the rest of the application. 

4. Examples: 


