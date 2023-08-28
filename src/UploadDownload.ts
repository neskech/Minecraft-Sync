import { abort } from 'process'
import { areYouReallySure, logDebug, tryGetMcDirFromJson, userInputOnlyValid } from './IO'

import { download, isInSync, uploadBulk } from './GitCommunication'
import cmdArgs from 'command-line-args'
import usage from 'command-line-usage'
import color from 'cli-color'
import { Option } from './Option'

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
          name: 'Minecraft world directory --> -d (your directory)',
          description: 'The directory of your minecraft world you want to sync',
        },
        {
          name: 'Upload or download --> -o (up or down)',
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

export default async function main() {
  const args = getArgs()

  if (args.help) {
    console.log(color.greenBright(getUsage()))
    return
  }

  const uploadOrDownload = Option.fromNull(args.upOrDown as string | null)
  if (!uploadOrDownload.predicate((s) => s == 'up' || s == 'down')) {
    console.error('Valid inputs to this program are "(up, down)"')
    return
  }

  const mcDir = Option.fromNull(args.directory as string | null)
    .lazyOr(() => tryGetMcDirFromJson())
    .unwrapOrElse(() => {
      console.error(
        'Please provide your minecraft world directory as the second argument',
      )
      abort()
    })

  const isSynced = (await isInSync()).unwrap()
  if (!isSynced) {
    console.warn(
      'You current world is out of sync with the cloud version! Consider downloading',
    )
  }

  const arg = uploadOrDownload.unwrap()
  const answer = userInputOnlyValid(`Are you sure you want to ${arg}load?`, ['y', 'n'])

  if (answer == 'y' && areYouReallySure(1)) {
    if (arg == 'up') {
      logDebug('Uploading changes to the cloud...')
      await uploadBulk(mcDir)
    } else {
      logDebug('Downloading from the cloud...')
      await download(mcDir)
    }
    return
  } else {
    logDebug('Exiting...')
  }
}

if (require.main === module) {
    main();
}
