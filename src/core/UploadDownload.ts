import { abort } from 'process'
import {
  areYouReallySure,
  assertLegalArgs,
  assertRequiredArgs,
  getConfig,
  logDebug,
  userInputOnlyValid,
} from '../util/IO'

import { download, isInSync, uploadBulk } from '../util/GitCommunication'
import cmdArgs from 'command-line-args'
import usage from 'command-line-usage'
import color from 'cli-color'
import { Option } from '../lib/Option'
import { getArgs } from './Root'

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
  assertLegalArgs(args, ['h', 'o'])
  assertRequiredArgs(args, ['t', 'o'])

  if (args.help) {
    console.log(color.greenBright(getUsage()))
    return
  }

  const op = args.upOrDown as string
  if (op  == 'up' || op == 'down') {
    console.error('Valid inputs to this program are "(up, down)"')
    return
  }

  const config = getConfig().unwrap()
  const dir = args.useServer ? config.serverDirectory : config.singlePlayerDirectory
  const syncDir = config.syncDirectory

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
