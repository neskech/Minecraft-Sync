import {
  areYouReallySure,
  assertLegalArgs,
  assertRequiredArgs,
  getConfig,
  setupSyncDirectory,
  userInputOnlyValid,
} from '../util/IO'

import {
  download,
  getOtherPlayersOnline,
  isInSync,
  uploadBulk,
} from '../util/GitCommunication'
import usage from 'command-line-usage'
import color from 'cli-color'
import { getArgs } from './Root'
import { logDebug } from '../util/IO';

function getUsage(): string {
  const sections = [
    {
      header: 'An app to sync minecraft worlds',
      content: 'Choose to upload or download your minecraft world from github',
    },
    {
      header: 'Options',
      optionList: [
        {
          name: 'Upload or download --> -o (up or down)',
          description: 'Perform upload and download operations without confirmation',
        },
        {
          name: 'Use server -> -t (true or false)',
          description: "Tells the app whether or not you're using a server directory",
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

export default async function main() {
  const args = getArgs()
  assertLegalArgs(args, ['help', 'upOrDown', 'useServer'])

  if (args.help) {
    console.log(color.greenBright(getUsage()))
    return
  }

  assertRequiredArgs(args, ['upOrDown'])
  logDebug(`Use server set to ${args.useServer}...`)

  const op = args.upOrDown as string
  if (op != 'up' && op != 'down') {
    console.error(`Valid inputs are "(up, down)" but found ${op}`)
    return
  }

  const config = getConfig(args.useServer)
    .mapErr((e) => e.includes('feature set 2') ? e : `${e}...\nConsider changing your config with feature set 2`)
    .unwrap(false)

  const dir = args.useServer ? config.serverDirectory : config.singlePlayerDirectory
  const syncDir = config.syncDirectory

  ;(await setupSyncDirectory(syncDir, config.repoLink)).unwrap()

  const otherPlayers = await getOtherPlayersOnline(syncDir)
  if (otherPlayers.isErr()) {
    console.log(
      color.redBright(
        'Unable to verify if other players are online. Proceed with caution',
      ),
    )
  } else if (otherPlayers.unwrap().length > 0) {
    console.log(color.redBright(`(${otherPlayers.unwrap().join(', ')}) are online!`))
  }

  const isSynced = (await isInSync(syncDir)).unwrap()
  if (!isSynced) {
    console.warn(
      'You current world is out of sync with the cloud version! Consider downloading',
    )
  }

  const answer = userInputOnlyValid(`Are you sure you want to ${op}load?`, ['y', 'n'])

  if (answer == 'y' && areYouReallySure(1)) {
    if (op == 'up') {
      logDebug('Uploading changes to the cloud...')
      await uploadBulk(dir, syncDir, args.useServer)
    } else {
      logDebug('Downloading from the cloud...')
      await download(dir, syncDir, args.useServer)
    }
    return
  } else {
    logDebug('Exiting...')
  }
}

if (require.main === module) {
  main()
}
