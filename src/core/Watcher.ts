import { Err, Ok, Result } from '../lib/Result'
import { existsSync, lstatSync, writeFileSync } from 'fs'
import { waitForMinecraftClose, waitForMinecraftOpen } from '../util/Waiting'
import {
  areYouReallySure,
  userInputOnlyValid,
  logDebug,
  dialogBox,
  getConfig,
  assertLegalArgs,
  assertRequiredArgs,
  setupSyncDirectory,
} from '../util/IO'
import { abort } from 'process'
import {
  download,
  getOtherPlayersOnline,
  isInSync,
  signalPlayerOffline,
  signalPlayerOnline,
  uploadBulk,
} from '../util/GitCommunication'
import cmdArgs from 'command-line-args'
import usage from 'command-line-usage'
import color from 'cli-color'
import { Option } from '../lib/Option'
import { getArgs } from './Root'

function getUsage(): string {
  const sections = [
    {
      header: 'An app to sync minecraft worlds',
      content: 'Syncs up your mc world via github',
    },
    {
      header: 'Options',
      optionList: [
        {
          name: 'Don\'t ask for confirmation -> -c (true or false)',
          description: 'Perform upload and download operations without confirmation',
        },
        {
          name: 'Use server -> -t (true or false)',
          description: 'Tells the app whether or not you\'re using a server directory',
        },
        {
          name: 'Help --> -h',
          description: 'This message',
        },
      ],
    },
  ]
  return usage(sections)
}

async function mainProcess(syncDir: string) {
  logDebug('Waiting for minecraft to open....')

  await waitForMinecraftOpen()

  const otherPlayers = await getOtherPlayersOnline(syncDir)

  if (otherPlayers.isErr()) {
    const res = await dialogBox(
      "Can't verify that there are other players online! Your changes won't be saved",
      'Minecraft',
    )
    res.mapErr((_) =>
      console.log(
        color.redBright(
          "Can't verify that there are other players online! Your changes won't be saved",
        ),
      ),
    )
    abort()
  }
  if (otherPlayers.unwrap().length > 0) {
    const res = await dialogBox(
      `(${otherPlayers.unwrap().join(', ')}) are online! Your changes won't be saved`,
      'Minecraft',
    )
    res.mapErr((_) =>
      console.log(
        color.redBright(
          `(${otherPlayers.unwrap().join(', ')}) are online! Your changes won't be saved`,
        ),
      ),
    )
    abort()
  }

  await signalPlayerOnline(syncDir)

  logDebug('Waiting for minecraft to close....')

  await waitForMinecraftClose()

  await signalPlayerOffline(syncDir)
}

export default async function main() {
  const args = getArgs()
  assertLegalArgs(args, ['h', 't', 'c'])
  assertRequiredArgs(args, ['t'])

  if (args.help) {
    console.log(color.greenBright(getUsage()))
    return
  }

  const config = getConfig().unwrap()
  const dir = args.useServer ? config.serverDirectory : config.singlePlayerDirectory
  const syncDir = config.syncDirectory

  ;(await setupSyncDirectory(syncDir, config.repoLink)).unwrap()

  const noConfirmation = args.confirmation ?? false

  const isSynced = (await isInSync(syncDir)).unwrap()
  if (!isSynced) {
    if (noConfirmation) {
      logDebug('Your world is out of sync. Retrieving data from the cloud...')
      ;(await download(dir, syncDir, args.useServer)).unwrap()
    } else {
      const answer = userInputOnlyValid(
        'Your world is out of sync. Do you want to download the most recent changes from the cloud?',
        ['y', 'n'],
      )
      if (answer == 'y') (await download(dir, syncDir, args.useServer)).unwrap()
      else return
    }
  }

  await mainProcess(syncDir)

  if (noConfirmation) {
    logDebug('Uploading changes to the cloud...')
    await uploadBulk(dir, syncDir, args.useServer)
    return
  }

  const answer = userInputOnlyValid('Would you like to upload your changes?', ['y', 'n'])

  if (answer == 'y' && areYouReallySure(3)) {
    logDebug('Uploading changes to the cloud...')
    await uploadBulk(dir, syncDir, args.useServer)
  } else {
    logDebug('Exiting without saving your changes...')
  }
}

if (require.main === module) {
  main()
}
