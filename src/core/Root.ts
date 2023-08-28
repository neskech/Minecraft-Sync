import cmdArgs from 'command-line-args'
import usage from 'command-line-usage'
import color from 'cli-color'
import FeatureSetZero from './Watcher'
import FeatureSetOne from './UploadDownload'
import { Option } from '../lib/Option'
import { assertLegalArgs } from '~/util/IO'

function getUsage(): string {
  const sections = [
    {
      header: 'An app to sync minecraft worlds',
      content: 'Choose which feature set you wish to use',
    },
    {
      header: 'Switching between feature sets',
      optionList: [
        {
          name: 'Feature Set Type --> -f (0, 1, or 2)',
          description:
            'To see detailed arguments and descriptions of each feature set, do <-f <set number> -h>',
        },
        {
          name: '-f 0',
          description:
            'Feature set 0 --> Automatically tracks your play session, syncing everything for you',
        },
        {
          name: '-f 1',
          description:
            'Feature set 1 --> Manual control over uploads and downloads of minecraft worlds',
        },
        {
          name: '-f 2',
          description: 'Feature set 2 --> Set configuration data',
        },
      ],
    },
  ]
  return usage(sections)
}

export function getArgs(): cmdArgs.CommandLineOptions {
  const optionDefinitions = [
    { name: 'helpRoot', alias: 'H', type: Boolean, defaultOption: false },
    { name: 'featureSet', alias: 'f', type: String },
    { name: 'singlePlayerDir', alias: 'd', type: String },
    { name: 'serverDir', alias: 's', type: String },
    { name: 'username', alias: 'u', type: String },
    { name: 'syncDir', alias: 'a', type: String },
    { name: 'githubRepoLink', alias: 'r', type: String },
    { name: 'useServer', alias: 't', type: Boolean, defaultOption: false },
    { name: 'confirmation', alias: 'c', type: Boolean, defaultOption: false },
    { name: 'help', alias: 'h', type: Boolean, defaultOption: false },
    { name: 'upOrDown', alias: 'o', type: String },
  ]
  return cmdArgs(optionDefinitions)
}

async function main() {
  const args = getArgs()
  assertLegalArgs(args, ['h', 't', 'c'])

  if ((args.helpRoot && !args.help) || Object.keys(args).every((k) => args[k] == null)) {
    console.log(color.greenBright(getUsage()))
    return
  }

  const featureSet = Option.fromNull(args.featureSet as string | null)
  if (!featureSet.predicate((c) => c == '0' || c == '1' || c == '2')) {
    console.log(color.redBright('Invalid choice of feature set. Exiting'))
    return
  }

  const f = featureSet.unwrap()
  if (f == '0') await FeatureSetZero()
  else if (f == '1') await FeatureSetOne()
  else await FeatureSetOne()
}

if (require.main === module) {
  main()
}
