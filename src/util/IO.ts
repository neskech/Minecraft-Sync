import { sys } from 'typescript'
import { None, Option, Some } from '../lib/Option'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  writeSync,
} from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { Err, Ok, Result, Unit, unit } from '../lib/Result'
import color from 'cli-color'
import cmdArgs from 'command-line-args'
import { includesAll, remove } from '../lib/listUtils'
import { exit } from 'process'
const prompt_ = require('prompt-sync')({ sigint: true })

export function deleteDirIfContents(dir: string) {
  const toDelete = readdirSync(makeFullPath(dir))
  for (const file of toDelete) {
    const fullPath = makeFullPath(`${dir}/${file}`)
    rmSync(fullPath, { recursive: true })
  }
}

export function execCommand(cmdStr: string): Promise<Result<string, string>> {
  return new Promise((resolve) => {
    exec(cmdStr, (error, stdout, stderr) => {
      if (error != null) return resolve(Err(error.message))
      else if (typeof stderr != 'string') {
        return resolve(Err(stderr))
      }
      return resolve(Ok(stdout))
    })
  })
}

export async function dialogBox(
  content: string,
  title: string,
): Promise<Result<Unit, string>> {
  /* TODO: do a search for the java file */
  const result = await execCommand(`java ../src/Main.java ${content} ${title}`)
  console.log(result.toString())
  if (result.isErr()) return Err(result.unwrapErr())
  return Ok(unit)
}

export function logDebug(...args: any) {
  console.log(color.yellowBright(...args))
}

export function makeFullPath(file: string): string {
  return join(__dirname, file)
}

export function userInputOnlyValid(question: string, choices: string[]): string {
  const questionStr = `${question} (${choices.join(' ')})`

  let isValidResp = false
  let response: string | null = null
  while (!isValidResp) {
    response = prompt_(questionStr + ' ')
    isValidResp = choices.some((c) => response == c)
    if (!isValidResp) console.log('Please give a valid response')
  }

  return response!
}

export function areYouReallySure(areYouReallys: number): boolean {
  let question = 'are you really sure? '
  for (let i = 0; i < areYouReallys; i++) {
    const answer = userInputOnlyValid(question, ['y', 'n'])
    if (answer == 'n') return false

    question = `are you ${'really '.repeat(i + 2)}sure?`
  }

  return true
}

export function assertLegalArgs(args: cmdArgs.CommandLineOptions, set: string[]) {
  const allLegal = remove(Object.keys(args), 'featureSet').filter((k) => !set.includes(k))
  if (allLegal.length > 0) {
    console.log(
      color.redBright(
        `Argument(s) (${allLegal.join(', ')}) are not allowed for this feature set`,
      ),
    )
    exit()
  }
}

export function assertRequiredArgs(args: cmdArgs.CommandLineOptions, set: string[]) {
  const notPresent = set.filter((k) => !(k in args) || args[k] == null)
  if (notPresent.length > 0) {
    console.log(
      color.redBright(
        `The required argument(s) (${notPresent.join(', ')}) are not present`,
      ),
    )
    exit()
  }
}

export async function getCurrentBranchName(
  syncDir: string,
): Promise<Result<string, string>> {
  return await execCommand(`cd ${syncDir} && git rev-parse --abbrev-ref HEAD`)
}

export async function getCurrentRepoOrigin(
  syncDir: string,
): Promise<Result<string, string>> {
  const res = await execCommand(`cd ${syncDir} && git remote -v`)
  if (res.isErr()) return Err(res.unwrapErr())

  const stdout = res.unwrap()
  const start = stdout.indexOf('https://')
  const end = stdout.indexOf('.git' + '.git'.length)
  return Ok(stdout.substring(start, end))
}

export async function setupSyncDirectory(
  syncDir: string,
  repoLink: string,
): Promise<Result<Unit, string>> {
  if (!existsSync(syncDir)) mkdirSync(syncDir)

  if (
    existsSync(`${syncDir}/.git`) &&
    (await getCurrentRepoOrigin(syncDir)).unwrap() == repoLink
  )
    return Ok(unit)

  if (existsSync(`${syncDir}/worldFiles`))
    rmSync(`${syncDir}/worldFiles`, { recursive: true })
  mkdirSync(`${syncDir}/worldFiles`)

  if (existsSync(`${syncDir}/.git`))
    rmSync(`${syncDir}/.git`, { recursive: true, force: true })

  const res1 = await execCommand(`cd ${syncDir} && git init -b main`)
  if (res1.isErr()) return Err(res1.unwrapErr())

  const res2 = await execCommand(`cd ${syncDir} && git remote add origin ${repoLink}`)
  if (res2.isErr()) return Err(res2.unwrapErr())

  writeFileSync(`${syncDir}/playerData.json`, JSON.stringify({}))
  const res3 = await execCommand(`cd ${syncDir} && git add . && git commit -m "dummy"`)
  if (res3.isErr()) return Err(res3.unwrapErr())

  const branchName = await getCurrentBranchName(syncDir)
  if (branchName.isErr()) return Err(branchName.unwrapErr())

  const res4 = await execCommand(
    `cd ${syncDir} && git push origin ${branchName.unwrap()} -force`,
  )
  if (res4.isErr()) return Err(res4.unwrapErr())

  return Ok(unit)
}

type Config = {
  username: string
  singlePlayerDirectory: string
  serverDirectory: string
  syncDirectory: string
  repoLink: string
}

function typeCheck(obj: any, property: string): boolean {
  return property in obj && typeof obj[property] == 'string'
}

export function mutateConfig(
  property: keyof Config,
  value: string,
): Result<Unit, string> {
  const f = makeFullPath('./config.json')
  if (!existsSync(f)) writeFileSync(f, JSON.stringify({}))

  if (
    property.includes('Directory') &&
    property != 'syncDirectory' &&
    !existsSync(value)
  ) {
    return Err(`The directory ${value} does not exist`)
  }

  const requiredSubFolders = ['world', 'wold_nether', 'world_the_end']
  if (
    property == 'serverDirectory' &&
    !includesAll(readdirSync(value), requiredSubFolders)
  ) {
    const subFiles = readdirSync(value)
    const notPresent = requiredSubFolders.filter((f) => !subFiles.includes(f))
    return Err(`Server directory is missing the required sub folders: ${notPresent}`)
  }

  const content = readFileSync(makeFullPath('./config.json'), {
    encoding: 'utf-8',
  })
  const result = JSON.parse(content)
  result[property] = value

  writeFileSync(f, JSON.stringify(result))
  return Ok(unit)
}

export function getConfig(needServer: boolean): Result<Config, string> {
  try {
    const content = readFileSync(makeFullPath('./config.json'), {
      encoding: 'utf-8',
    })
    const result = JSON.parse(content)

    const properties = [
      'username',
      'singlePlayerDirectory',
      'serverDirectory',
      'syncDirectory',
      'repoLink',
    ]
    const notThere = properties.filter((p) => {
      if (p == 'singlePlayerDirectory' && needServer) return false
      if (p == 'serverDirectory' && needServer) return false

      return !typeCheck(result, p)
    })
    if (notThere.length > 0)
      return Err(
        `Properties ${notThere} missing from config file. Try filling them out with feature set 2`,
      )

    const dontExist = properties.filter((p) => {
      if (p == 'singlePlayerDirectory' && needServer) return false
      if (p == 'serverDirectory' && needServer) return false
      if (p == 'syncDirectory') return false
      return p.includes('Directory') && !existsSync(result[p])
    })
    if (dontExist.length > 0)
      return Err(
        `The following directories from your config do not exist on your system. Consider changing them with feature set 2.\n\n---> ${dontExist}`,
      )

    return Ok(result as Config)
  } catch (e) {
    return Err("Couldn't read config file")
  }
}

type Optional<T> = { [K in keyof T]?: T[K] }

export function getConfigRaw(): Optional<Config> {
  const content = readFileSync(makeFullPath('./config.json'), {
    encoding: 'utf-8',
  })
  const result = JSON.parse(content)
  return result as Optional<Config>
}
