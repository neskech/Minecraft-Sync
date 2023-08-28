import { Err, Ok, Result } from './Result'
import { existsSync, lstatSync, writeFileSync } from 'fs'
import { waitForMinecraftClose, waitForMinecraftOpen } from './Waiting'
import {
  areYouReallySure,
  userInputOnlyValid,
  tryGetMcDirFromJson,
  makeFullPath,
  logDebug,
  dialogBox,
} from './IO'
import { abort } from 'process'
import {
  download,
  getOtherPlayersOnline,
  isInSync,
  signalPlayerOffline,
  signalPlayerOnline,
  uploadBulk,
} from './GitCommunication'
import cmdArgs from 'command-line-args'
import usage from 'command-line-usage'
import color from 'cli-color'
import { Option } from './Option'

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
          name: 'Minecraft world directory --> -d (your directory)',
          description: 'The directory of your minecraft world you want to sync',
        },
        {
          name: 'No Confirmation -> -c (true or false)',
          description: 'Perform upload and download operations without confirmation',
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

export function getArgs(): cmdArgs.CommandLineOptions {
  const optionDefinitions = [
    { name: 'helpRoot', alias: 'H', type: Boolean, defaultOption: false },
    { name: 'featureSet', alias: 't', type: String },

    /* To prevent error */
    { name: 'directory', alias: 'd', type: String },
    { name: 'confirmation', alias: 'c', type: Boolean, defaultOption: false },
    { name: 'help', alias: 'h', type: Boolean, defaultOption: false },
    { name: 'upOrDown', alias: 'o', type: String },
  ]
  return cmdArgs(optionDefinitions)
}

function getMcWorldDirFromArgs(arg: Option<string>): Result<string, string> {
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

async function mainProcess() {
  logDebug('Waiting for minecraft to open....')

  await waitForMinecraftOpen()

  const otherPlayers = await getOtherPlayersOnline()

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

  await signalPlayerOnline()

  logDebug('Waiting for minecraft to close....')

  await waitForMinecraftClose()

  await signalPlayerOffline()
}

export default async function main() {
  const args = getArgs()

  if (args.help) {
    console.log(color.greenBright(getUsage()))
    return
  }

  const mcDir = getMcWorldDirFromArgs(Option.fromNull(args.directory as string | null))
    .lazyOrErr((e) =>
      tryGetMcDirFromJson()
        .toResult()
        .mapErr((_) => e),
    )
    .unwrap()

  const noConfirmation = args.confirmation ?? false

  const isSynced = (await isInSync()).unwrap()
  if (!isSynced) {
    if (noConfirmation) {
      logDebug('Your world is out of sync. Retrieving data from the cloud...')
      ;(await download(mcDir)).unwrap()
    } else {
      const answer = userInputOnlyValid(
        'Your world is out of sync. Do you want to download the most recent changes from the cloud?',
        ['y', 'n'],
      )
      if (answer == 'y') (await download(mcDir)).unwrap()
      else return
    }
  }

  await mainProcess()

  if (noConfirmation) {
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

if (require.main === module) {
  main();
}
