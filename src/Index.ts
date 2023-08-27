import { Err, Ok, Result } from './Result'
import { existsSync, lstatSync, writeFileSync } from 'fs'
import { waitForMinecraftClose, waitForMinecraftOpen } from './Waiting'
import {
  areYouReallySure,
  tryGetArg,
  userInputOnlyValid,
  tryGetMcDirFromJson,
  makeFullPath,
  logDebug,
} from './IO'
import { abort } from 'process'
import {
  getOtherPlayersOnline,
  isInSync,
  signalPlayerOffline,
  signalPlayerOnline,
  uploadBulk,
} from './GitCommunication'
const dialog = require('dialog')

function getMcWorldDirFromArgs(): Result<string, string> {
  const arg = tryGetArg(0)
  if (arg.isNone()) return Err('Please supply your minecraft world directory')

  const name = arg.unwrap()

  if (!existsSync(name)) return Err('That directory does not exist')

  if (!lstatSync(name).isDirectory()) return Err('That path is not a directory')

  writeFileSync(
    makeFullPath('../gitData/minecraftDirectory.json'),
    JSON.stringify({
      directory: name,
    }),
  )

  return Ok(name)
}

async function mainProcess(mcDir: string) {
  logDebug('Waiting for minecraft to open....')

  await waitForMinecraftOpen()

  const otherPlayers = await getOtherPlayersOnline()
  if (otherPlayers.isErr()) {
    dialog.Err(
      "Can't verify that there are other players online! Your changes won't be saved",
      'Minecraft',
      () => {},
    )
    abort()
  }
  if (otherPlayers.unwrap().length > 0) {
    dialog.Err(
      `(${otherPlayers.unwrap().join(', ')}) are online! Your changes won't be saved`,
      'Minecraft',
      () => {},
    )
    abort()
  }

  await signalPlayerOnline()

  logDebug('Waitinf for minecraft to close....')

  await waitForMinecraftClose()

  await signalPlayerOffline()
}

async function main() {
  const mcDir = getMcWorldDirFromArgs()
    .lazyOrErr((e) =>
      tryGetMcDirFromJson()
        .toResult()
        .mapErr((_) => e),
    )
    .unwrap()

  const isSynced = (await isInSync()).unwrap()
  if (!isSynced) {
    console.error(
      'You current world is out of sync with the cloud version! Please synchronize before opening minecraft again',
    )
    return
  }

  await mainProcess(mcDir)

  const noConfirmation = tryGetArg(1)
  if (noConfirmation.isNone() || noConfirmation.unwrap() != 'noConf') {
    logDebug('Uploading changes to the cloud...')
    await uploadBulk(mcDir)
    return
  }

  const answer = userInputOnlyValid('Would you like to upload your changes?', ['y', 'n'])

  if (answer == 'y' && areYouReallySure(3)) {
    logDebug('Uploading changes to the cloud...')
    await uploadBulk(mcDir)
  } else {
    logDebug('Exiting without saving your changes...')
  }
}

main()
