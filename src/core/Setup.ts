import { assertLegalArgs, getConfigRaw, mutateConfig } from '../util/IO'
import usage from 'command-line-usage'
import color from 'cli-color'
import { getArgs } from './Root'

function getUsage(): string {
  const sections = [
    {
      header: 'Set your configuration data',
      content: 'Data set here will allow the other feature sets to run',
    },
    {
      header: 'Options',
      optionList: [
        {
          name: 'Set Minecraft SINGEPLAYER world directory --> -d (your directory)',
          description:
            'The directory of the singleplayer minecraft world you want to sync',
        },
        {
          name: 'Set Minecraft SERVER world directory --> -s (your directory)',
          description: 'The directory of the minecraft server world you want to sync',
        },
        {
          name: 'Set username --> -u (username)',
          description: "What other players will see when you're online",
        },
        {
          name: 'Set sync directory --> -a (your directory)',
          description:
            'Set the directory that will be used to store files during syncing',
        },
        {
          name: 'Set git repo --> -r (repository URL)',
          description: 'Set the git repo that will be used for syncing',
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
  assertLegalArgs(args, [
    'help',
    'singlePlayerDir',
    'serverDir',
    'syncDir',
    'githubRepoLink',
    'username',
  ])

  if (args.help) {
    console.log(color.greenBright(getUsage()))
    return
  }

  if (args.singlePlayerDir)
    mutateConfig('singlePlayerDirectory', args.singlePlayerDir).unwrap()

  if (args.serverDir) mutateConfig('serverDirectory', args.singlePlayerDir).unwrap()

  if (args.syncDir) mutateConfig('syncDirectory', args.syncDir).unwrap()

  if (args.githubRepoLink) mutateConfig('repoLink', args.githubRepoLink).unwrap()

  if (args.username) mutateConfig('username', args.username).unwrap()

  const keys = [
    'singlePlayerDirectory',
    'serverDirectory',
    'syncDirectory',
    'repoLink',
    'username',
  ]
  const raw = getConfigRaw()

  console.log(color.greenBright('Your current config:\n'))
  console.log(raw)
  console.log()

  const missingKeys = keys.filter((k) => !(k in raw))
  if (missingKeys.length > 0)
    console.log(
      color.redBright(
        'Warning: Your config file is still missing the following properties:\n\n',
      ) + color.yellow(missingKeys.join('\n')),
    )
}

if (require.main === module) {
  main()
}
