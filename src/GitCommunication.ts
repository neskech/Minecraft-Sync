import { config } from 'dotenv'
import { GoogleApis, drive_v3, google, oauth2_v2 } from 'googleapis'
import { Err, Ok, Result, Unit, unit } from './Result'
import {
  copyFileSync,
  createReadStream,
  existsSync,
  readdir,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs'
import { debug } from 'console'
import { debuglog } from 'util'
import Zip from 'adm-zip'
import { Extract } from 'unzipper'
import path from 'path'
import { copyFile } from 'fs/promises'
import { readFileSync } from 'fs'
import { userInfo } from 'os'
import { logDebug } from './FileWatcher'
import { exec } from 'child_process'
import { copySync } from 'fs-extra'

config()

function makeFullPath(file: string): string {
  return path.join(__dirname, file)
}

function deleteDirIfContents(dir: string) {
  const toDelete = readdirSync(makeFullPath(dir))
  for (const file of toDelete) {
    unlinkSync(makeFullPath(`${dir}/${file}`))
  }
}

function execCommand(cmdStr: string): Promise<Result<string, string>> {
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

async function switchBranch(branchName: string): Promise<Result<Unit, string>> {
  const result = await execCommand(`git checkout ${branchName}`)
  if (result.isErr()) return Err(result.unwrapErr())
  return Ok(unit)
}

async function pullFromRepo(): Promise<Result<Unit, string>> {
  const result = await execCommand('git reset --hard origin sync')

  if (result.isErr()) return Err(result.unwrapErr())

  return Ok(unit)
}

async function pushToRepo(): Promise<Result<Unit, string>> {
  const result = await execCommand(
    'git add . && git commit -m "sync" && git push origin sync',
  )

  if (result.isErr()) return Err(result.unwrapErr())

  return Ok(unit)
}

export async function isOutOfSync(): Promise<boolean> {

}

export async function signalPlayerOnline(): Promise<Result<Unit, string>> {
  const res1 = await switchBranch('sync')

  if (res1.isErr()) return Err(res1.unwrapErr())

  const res2 = await pullFromRepo()

  if (res2.isErr()) {
    await switchBranch('main')
    return Err(res2.unwrapErr())
  }

  const content = readFileSync(makeFullPath('../gitData/playerData.json'), {
    encoding: 'utf-8',
  })
  const json = JSON.parse(content) as Record<string, boolean>
  const username = userInfo().username
  json[username] = true

  const res3 = await switchBranch('main')
  if (res3.isErr()) return Err(res3.unwrapErr())

  return Ok(unit)
}

export async function signalPlayerOffline() {
  const res1 = await switchBranch('sync')

  if (res1.isErr()) return Err(res1.unwrapErr())

  const res2 = await pullFromRepo()

  if (res2.isErr()) {
    await switchBranch('main')
    return Err(res2.unwrapErr())
  }

  const content = readFileSync(makeFullPath('../gitData/playerData.json'), {
    encoding: 'utf-8',
  })
  const json = JSON.parse(content) as Record<string, boolean>
  const username = userInfo().username
  json[username] = false

  const res3 = await switchBranch('main')
  if (res3.isErr()) return Err(res3.unwrapErr())

  return Ok(unit)
}

export async function isAnotherPlayerOnline(): Promise<Result<boolean, string>> {
  const res1 = await switchBranch('sync')
  if (res1.isErr()) return Err(res1.unwrapErr())

  const res2 = await pullFromRepo()
  if (res2.isErr()) {
    await switchBranch('main')
    return Err(res2.unwrapErr())
  }

  const content = readFileSync(makeFullPath('../gitData/playerData.json'), {
    encoding: 'utf-8',
  })
  const json = JSON.parse(content) as Record<string, boolean>

  const res3 = await switchBranch('main')
  if (res3.isErr()) return Err(res3.unwrapErr())

  return Ok(new Array(Object.values(json)).some((online) => online))
}

export async function upload(
  dir: string,
  files: string[],
): Promise<Result<Unit, string>> {
  const res1 = await switchBranch('sync')
  if (res1.isErr()) return Err(res1.unwrapErr())

  deleteDirIfContents('../gitData/worldFiles/')
  for (const file of files) {
    const fullPath = path.join(dir, file)

    if (!existsSync(fullPath)) return Err(`File ${fullPath} does not exist!`)

    await copyFile(fullPath, makeFullPath(`../gitData/worldFiles/${file}`))
  }

  const zip = new Zip()
  zip.addLocalFolder(makeFullPath('../gitData/worldFiles'))
  zip.writeZip('../gitData/worldData.zip')
  deleteDirIfContents('../gitData/worldFiles/')

  const res2 = await pushToRepo()
  if (res2.isErr()) return Err(res2.unwrapErr())

  const res3 = await switchBranch('main')
  if (res3.isErr()) return Err(res3.unwrapErr())

  return Ok(unit)
}

export async function uploadBulk(dir: string): Promise<Result<Unit, string>> {
  const res1 = await switchBranch('sync')
  if (res1.isErr()) return Err(res1.unwrapErr())

  const zip = new Zip()
  zip.addLocalFolder(dir)
  zip.writeZip('../gitData/worldData.zip')

  const res2 = await pushToRepo()
  if (res2.isErr()) return Err(res2.unwrapErr())

  const res3 = await switchBranch('main')
  if (res3.isErr()) return Err(res3.unwrapErr())

  return Ok(unit)
}

export async function download(dir: string): Promise<Result<Unit, string>> {
  const res1 = await switchBranch('sync')
  if (res1.isErr()) return Err(res1.unwrapErr())
  
  const res2 = await pullFromRepo()
  if (res2.isErr()) return Err(res2.unwrapErr())

  if (!existsSync(makeFullPath('../gitData/worldData.zip')))
    return Err('No zip file to download from')

  deleteDirIfContents('../gitData/worldFiles/')

  createReadStream(makeFullPath('../gitData/worldData.zip')).pipe(
    Extract({ path: makeFullPath('../gitData/worldFiles') }),
  )

  const unZipped = readdirSync(makeFullPath('../gitData/worldFiles/'))
  for (const file of unZipped) {
    const fullPath = makeFullPath(`../gitData/worldFiles/${file}`)
    copySync(fullPath, `${dir}`)
  }

  deleteDirIfContents('../gitData/worldFiles/')

  const res3 = await switchBranch('main')
  if (res3.isErr()) return Err(res3.unwrapErr())

  return Ok(unit)
}
