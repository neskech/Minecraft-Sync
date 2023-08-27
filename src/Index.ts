import { Err, Ok, Result } from './Result';
import { existsSync, lstatSync, writeFileSync } from 'fs'
import FileSysWatcher, { FileDescriptor, Operation, logDebug } from './FileWatcher'
import { waitForMinecraftClose, waitForMinecraftOpen } from './Waiting'
import { isAnotherPlayerOnline, signalPlayerOffline, signalPlayerOnline, upload } from './Communication'
import { areYouReallySure, tryGetArg, userInputOnlyValid, tryGetMcDirFromJson, makeFullPath } from './IO';
import { abort } from 'process';
import { getOtherPlayersOnline, isInSync } from './GitCommunication';
const dialog = require('dialog')

function getMcWorldDirFromArgs(): Result<string, string> {
  const arg = tryGetArg(0)
  if (arg.isNone()) return Err('Please supply your minecraft world directory')

  const name = arg.unwrap()

  if (!existsSync(name)) return Err('That directory does not exist')

  if (!lstatSync(name).isDirectory()) return Err('That path is not a directory')

  writeFileSync(makeFullPath('../gitData/minecraftDirectory.json'), JSON.stringify({
    directory: name
  }))

  return Ok(name)
}

async function mainProcess(mcDir: string): Promise<FileDescriptor[]> {
  logDebug('Waiting for minecraft to open....')

  await waitForMinecraftOpen()

  const otherPlayers = await getOtherPlayersOnline()
  if (otherPlayers.isErr()) {
    dialog.Err("Can't verify that there are other players online! Your changes won't be saved", "Minecraft", () => {})
    abort()
  }
  if (otherPlayers.unwrap().length > 0) {
    dialog.Err(`(${otherPlayers.unwrap().join(', ')}) are online! Your changes won't be saved`, "Minecraft", () => {})
    abort()
  }

  const fsWatcher = new FileSysWatcher(mcDir)
  fsWatcher.enableLogging()

  await signalPlayerOnline()

  logDebug('Waitinf for minecraft to close....')

  await waitForMinecraftClose()
  
  await signalPlayerOffline()

  const results = fsWatcher.getReport()
  fsWatcher.stopWatching()

  return results
}

function displayFileReport(files: FileDescriptor[]) {
  const red = '#d12e82'
  const green = '#2ed172'
  const blue = '#2e8ad1'

  const opToColor = (op: Operation) => {
    switch (op) {
      case 'added':
        return green
      case 'changed':
        return blue
      case 'removed':
        return red
    }
  }

  for (const { name, operation } of files) {
    console.log(`${operation} ${name}`, `color: ${opToColor(operation)}`)
  }

  console.log('\n\n\n')
}

async function main() {
  const mcDir = getMcWorldDirFromArgs().lazyOrErr((e) => tryGetMcDirFromJson().toResult().mapErr(_ => e)).unwrap()

  const isSynced = (await isInSync()).unwrap()
  if (!isSynced) {
    console.error('You current world is out of sync with the cloud version! Please synchronize before opening minecraft again')
    return
  }

  const files = await mainProcess(mcDir)
  displayFileReport(files)

  const noConfirmation = tryGetArg(1)
  if (noConfirmation.isNone() || noConfirmation.unwrap() != 'noConf') {
    logDebug('Uploading changes to the cloud...')
    await upload(mcDir, files.map(f => f.name))
    writeFileSync('../data/fileData.json', JSON.stringify(files))
    return
  }
  
  const answer = userInputOnlyValid('Would you like to upload your changes?', ['y', 'n'])

  if (answer == 'y' && areYouReallySure(3)) {
    logDebug('Uploading changes to the cloud...')
    await upload(mcDir, files.map(f => f.name))
    writeFileSync('../data/fileData.json', JSON.stringify(files))
  }
  else {
    logDebug('Exiting without saving your changes...')
  }
}

main()
