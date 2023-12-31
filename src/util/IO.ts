import { sys } from 'typescript'
import { None, Option, Some } from '../lib/Option'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'fs'
import { join, resolve } from 'path'
import { exec } from 'child_process'
import { Err, Ok, Result, Unit, unit } from '../lib/Result'
import color from 'cli-color'
import cmdArgs from 'command-line-args'
import { includesAll, remove } from '../lib/listUtils'
import { cwd, exit } from 'process'
import { strip } from '../lib/Misc'
import { moveSync, rmdirSync } from 'fs-extra'
const prompt_ = require('prompt-sync')({ sigint: true })

export function deleteDirIfContents(dir: string) {
  const toDelete = readdirSync(makeFullPath(dir))
  for (const file of toDelete) {
    const fullPath = makeFullPath(`${dir}/${file}`)
    rmSync(fullPath, { recursive: true })
  }
}

export function moveFodlerOverwrite(srcDir: string, destDir: string) {
  if (srcDir.at(-1) == '/') srcDir = srcDir.substring(0, srcDir.length - 1)
  if (destDir.at(-1) == '/') destDir = destDir.substring(0, destDir.length - 1)

  const folderName = srcDir.substring(srcDir.lastIndexOf('/') + 1)

  if (existsSync(`${destDir}/${folderName}`)) rmSync(`${destDir}/${folderName}`, {recursive: true})

  moveSync(srcDir, `${destDir}/${folderName}`)
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

export function searchForFile(dir: string, name: string): Option<string> {
  const files = readdirSync(dir)
  for (const file of files) {
    const full = makeFullPath(`${dir}/${file}`)

    if (statSync(full).isDirectory()) return searchForFile(`${dir}/${file}`, name)
    else if (file == name) return Some(full)
  }

  return None()
}

export async function dialogBox(
  content: string,
  title: string,
): Promise<Result<Unit, string>> {
  const file = searchForFile('.', 'Main.java')
  if (file.isNone()) return Err('Could not find java file')

  const result = await execCommand(`java ../src/Main.java ${content} ${title}`)

  if (result.isErr()) return Err(result.unwrapErr())
  return Ok(unit)
}

export function logDebug(...args: any) {
  console.log(color.yellowBright(...args))
}

export function makeFullPath(file: string): string {
  return resolve(cwd(), file)
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

function repo(s: string): Option<string> {
  let start = -1
  if (s.includes('https://')) start = s.indexOf('https://') + 'https://'.length
  else if (s.includes('git@')) start = s.indexOf('git@') + 'git@'.length

  if (start == -1) return None()

  const end = s.indexOf('.git')
  return Some(s.substring(start, end))
}

export async function getCurrentRepoOrigin(
  syncDir: string,
): Promise<Result<string, string>> {
  const res = await execCommand(`cd ${syncDir} && git remote -v`)
  if (res.isErr()) return Err(res.unwrapErr())

  const stdout = res.unwrap()
  const s = repo(stdout)

  if (s.isNone()) return Err(`Invalid repo ${syncDir}`)

  return Ok(s.unwrap())
}

export async function setupSyncDirectory(
  syncDir: string,
  repoLink: string,
): Promise<Result<Unit, string>> {
  if (!existsSync(syncDir)) mkdirSync(syncDir)

  if (
    existsSync(`${syncDir}/.git`) &&
    (await getCurrentRepoOrigin(syncDir)).unwrap() == repo(repoLink).unwrap()
  )
    return Ok(unit)

  if (existsSync(`${syncDir}/worldFiles`))
    rmSync(`${syncDir}/worldFiles`, { recursive: true })
  mkdirSync(`${syncDir}/worldFiles`)

  if (existsSync(`${syncDir}/.git`))
    rmSync(`${syncDir}/.git`, { recursive: true, force: true })

  const res1 = await execCommand(`cd ${syncDir} && git clone ${repoLink} .`)
  if (res1.isErr()) return Err(res1.unwrapErr())

  const res2 = await execCommand(`cd ${syncDir} && git config pull.rebase true`)
  if (res2.isErr()) return Err(res2.unwrapErr())

  if (!existsSync(`${syncDir}/playerData.json`))
    writeFileSync(`${syncDir}/playerData.json`, JSON.stringify({}))
  if (!existsSync(`${syncDir}/worldFiles`)) mkdirSync(`${syncDir}/worldFiles`)

  writeFileSync(`${syncDir}/playerData.json`, JSON.stringify({}))
  const res3 = await execCommand(`cd ${syncDir} && git add . && git commit -m "dummy"`)
  if (res3.isErr()) return Err(res3.unwrapErr())

  const res4 = await execCommand(`cd ${syncDir} && git push origin main`)
  if (res4.isErr()) return Err(res4.unwrapErr())

  return Ok(unit)
}

type Config = {
  username: string
  singlePlayerDirectory: string
  serverDirectory: string
  syncDirectory: string
  repoLink: string
  minecraftProcessName: string
  firstTime: boolean
}

function typeCheck(obj: any, property: string): boolean {
  return property in obj && typeof obj[property] == 'string'
}

export function mutateConfig(
  property: keyof Config,
  value: string,
): Result<Unit, string> {
  const f = makeFullPath('./config.json')
  if (!existsSync(f)) {
    appendFileSync(f, JSON.stringify({}))
    mutateConfig('firstTime', 'true').unwrap()
  }

  if (
    property.includes('Directory') &&
    property != 'syncDirectory' &&
    !existsSync(value)
  ) {
    return Err(`The directory ${value} does not exist`)
  }

  const requiredSubFolders = ['world', 'world_nether', 'world_the_end']
  if (
    property == 'serverDirectory' &&
    !includesAll(readdirSync(value), requiredSubFolders)
  ) {
    const subFiles = readdirSync(value)
    const notPresent = requiredSubFolders.filter((f) => !subFiles.includes(f))
    return Err(`Server directory is missing the required sub folders: ${notPresent}`)
  }

  if (property == 'repoLink' || property == 'syncDirectory')
    mutateConfig('firstTime', 'true').unwrap()

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
      if (p == 'serverDirectory' && !needServer) return false

      return !typeCheck(result, p)
    })
    if (notThere.length > 0)
      return Err(
        `Propertie(s) ${notThere.join(
          ', ',
        )} missing from config file. Try filling them out with feature set 2`,
      )

    const dontExist = properties.filter((p) => {
      if (p == 'singlePlayerDirectory' && needServer) return false
      if (p == 'serverDirectory' && !needServer) return false
      if (p == 'syncDirectory') return false
      return p.includes('Directory') && !existsSync(result[p])
    })
    if (dontExist.length > 0)
      return Err(
        `The following directories from your config do not exist on your system. Consider changing them with feature set 2.\n\n---> ${dontExist}`,
      )

    if (!result.minecraftProcessName)
      return Err(
        'Minecraft process name not found in configuration file. Try filling it out with feature set 2',
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
