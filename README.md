# Minecraft-Sync
-----
## A command line tool to synchronize your minecraft worlds with other players

This tool is for those who want to self host a server but rarely have a time to. 

For example, let's say a friend wants to play on your server but you're not home to host it. One possible solution to this would be for that friend to just drag and drop the server files into a singleplayer world, play on it, then drag and drop the changes back on the server before you come back. 

But... That's kind of tedious. So I made this tool to automate that. Using 'feature set 0' of this repo will allow you to run a program that automically detects when you open and close minecraft, doing all the syncing in the background. No need for manual labor!

And if there are other players on the server, the program will attempt to warn you to prevent merge conflicts

To get started run the executable in the bin/ directory (npm run build) 
