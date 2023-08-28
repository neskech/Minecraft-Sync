import cmdArgs from 'command-line-args'
import usage from 'command-line-usage'
import color from 'cli-color'
import FeatureSetZero from './Index'
import FeatureSetOne from './UploadDownload'
import { Option } from './Option'

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
          name: 'Feature Set Type --> -t (0 or 1, defaults 0)',
          description: 'The directory of your minecraft world you want to sync',
        },
        {
          name: 'Help --> -H',
          description: 'This message',
        },
      ],
    },
    {
      header:
        'Feature Set 0 Options (Player Minecraft, automatically sync your changes at the end)',
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
    {
      header: 'Feature Set 1 Options (Upload Or Download)',
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

async function main() {
  const args = getArgs()

  if ((args.helpRoot && !args.help) || Object.keys(args).every(k => args[k] == null)) {
    console.log(color.greenBright(getUsage()))
    return
  }

  const featureSet = Option.fromNull(args.featureSet as string | null);
  if (!featureSet.predicate(c => c == '0' || c == '1')) {
    console.log(color.redBright('Invalid choice of feature set. Exiting'))
    return
  }

  if (featureSet.unwrap() == '0') await FeatureSetZero()
  else await FeatureSetOne()
}

if (require.main === module) {
  main()
}
