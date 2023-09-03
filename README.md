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
### 1a. Clone git repo, click on the clone button use https or SSH, either work. 
---------------------------------------------------------------------------
```console
git clone https://github.com/neskech/Minecraft-Sync.git 
```
## or 

```console
git clone git@github.com:neskech/Minecraft-Sync.git 
```

### 1b. If you dont want to build the app yourself, then download one of the executables and run that instead

### 2. Run this command in order to set the configuration of the application, please do every command besides ServerDirectory. Unless you are hosting a server. 
```console 
./bin/index -f 2 -h
```

### 3. Explanation of feature sets: 
  Use this command to get a brief overview of the application 
  ```console
  ./bin/index -H 
  ```
  What each command does: 
  
  ## Watcher (f = 0)
  - Detects when you're on Minecraft, downloads from the cloud if needed, automatically retrieves your changes, and uploads them to the git. 

  ## Upload and Download (f = 1)
  - Manual uploading and downloading. 

  ## Configuration (f = 2)
  - Sets configuration data, this must be done first before using the rest of the application. 
-----------
## 4. Example run through
```console
  git clone https://github.com/neskech/Minecraft-Sync.git
```

  ### If you want to rebuild the executable
```console
  npm run build
```

  ### Run the exectuable, located in the bin folder 
  ### (Running the help command to see the available feature sets) 

```console 
  cd bin
  ./index -H
```

  ### First step is to setup configuration
  ### (Running the help command to see config options)

```console 
  ./index  -f 2 -h
```


   ### We're not going to run the server ourselves, so we'll set up a singleplayer directory
   ### if you're running this on WSL, then this directory must be via /mnt/

   ```console
  ./index -f 2 -d <your singelplayer world directory>
  ```

  ### If you're running a server, then use this
  ### unlike the singleplayer directory, this must be OUTSIDE your world/ folder 
  ```console    
  ./index -f 2 -s <your server directory>
  ```

  ### Set username. If other people are playing, they'll be alerted that you're online
  ### with this name 
```console
  ./index -f 2 -u <username>
```

  ### Set your sync directory. This will be the central place where your world syncs
  ### if the directory doesn't exist, the app will make it for you
  ```console
  ./index -f 2 -a <your sync directory>
  ```

  ### Set the github repo url. This'll be the repository that's used to synchronize
  ### between you and your friends
  ```console
  ./index -r <your git repository url>
  ```

  ### Set your minecraft process name. You can find the process name
  ### by going into your task manager. For vanilla minecraft, just type 'minecraft'
  ```console
  ./index -p <your process name>
  ```

  ### Now that configuration is done, you're all set!

  ### If your friends have already made some progress, try downloading from them
  ```console
  ./index -f 1 -o down
  ```
  ### If you want to manually upload, then do this
  ```console
  ./index -f 1 -o up
  ```

  ### If you want to automate this process, then use feature set 2
  ### using the -c flag will automatically download starting out
  ### then it will wait for you to open and close minecraft, uploading
  ### at the end
  ```console
  ./index -f 2
  ```


