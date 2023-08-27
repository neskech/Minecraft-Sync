import { config } from 'dotenv'
import { GoogleApis, drive_v3, google, oauth2_v2 } from 'googleapis'
import { Err, Ok, Result, Unit, unit } from './Result'
import {
  copyFileSync,
  cpSync,
  createReadStream,
  existsSync,
  readdir,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
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
import { exec } from 'child_process'
import { copySync } from 'fs-extra'
import { execCommand, makeFullPath } from './IO'

function deleteDirIfContents(dir: string) {
  const toDelete = readdirSync(makeFullPath(dir))
  for (const file of toDelete) {
    const fullPath = makeFullPath(`${dir}/${file}`)
    rmSync(fullPath, { recursive: true })
  }
}

function getWorldNameFromWorldDirectory(dir: string): string {
  return dir.substring(dir.lastIndexOf('/') + 1)
}

async function switchBranch(branchName: string): Promise<Result<Unit, string>> {
  const result = await execCommand(`cd gitData && git checkout ${branchName}`)
  if (result.isErr()) return Err(result.unwrapErr())
  return Ok(unit)
}

async function pullFromRepo(): Promise<Result<Unit, string>> {
  const result = await execCommand('cd gitData && git reset --hard sync')

  if (result.isErr()) return Err(result.unwrapErr())

  return Ok(unit)
}

async function pushToRepo(): Promise<Result<Unit, string>> {
  const result = await execCommand(
    'cd gitData && git add . && git commit -m "sync" && git push origin sync',
  )

  if (result.isErr()) return Err(result.unwrapErr())

  return Ok(unit)
}

export async function isInSync(): Promise<Result<boolean, string>> {
  const res1 = await switchBranch('sync')
  if (res1.isErr()) return Err(res1.unwrapErr())

  const res2 = await execCommand('cd gitData && git pull origin sync')
  if (res2.isErr()) return Err(res2.unwrapErr())

  const out = res2.unwrap()
  const result = out.toLowerCase().includes('already up to date')

  return Ok(result)
}

export async function signalPlayerOnline(): Promise<Result<Unit, string>> {
  const res1 = await switchBranch('sync')
  if (res1.isErr()) return Err(res1.unwrapErr())

  const res2 = await pullFromRepo()

  if (res2.isErr()) {
    return Err(res2.unwrapErr())
  }

  const content = readFileSync(makeFullPath('../gitData/playerData.json'), {
    encoding: 'utf-8',
  })
  const json = JSON.parse(content) as Record<string, boolean>
  const username = userInfo().username
  json[username] = true

  writeFileSync(makeFullPath('../gitData/playerData.json'), JSON.stringify(json))

  const res3 = await pushToRepo()
  if (res3.isErr()) {
    return Err(res3.unwrapErr())
  }

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

  writeFileSync(makeFullPath('../gitData/playerData.json'), JSON.stringify(json))

  const res3 = await pushToRepo()
  if (res3.isErr()) {
    return Err(res3.unwrapErr())
  }

  return Ok(unit)

  return Ok(unit)
}

export async function getOtherPlayersOnline(): Promise<Result<string[], string>> {
  const res1 = await switchBranch('sync')
  if (res1.isErr()) return Err(res1.unwrapErr())

  const res2 = await pullFromRepo()
  if (res2.isErr()) {
    return Err(res2.unwrapErr())
  }

  const content = readFileSync(makeFullPath('../gitData/playerData.json'), {
    encoding: 'utf-8',
  })
  const json = JSON.parse(content) as Record<string, boolean>

  return Ok(Object.keys(json).filter((k) => json[k]))
}

export async function upload(
  dir: string,
  files: string[],
): Promise<Result<Unit, string>> {
  const res1 = await switchBranch('sync')
  if (res1.isErr()) return Err(res1.unwrapErr())

  deleteDirIfContents('../gitData/worldFiles')
  for (const file of files) {
    const fullPath = path.join(dir, file)

    if (!existsSync(fullPath)) return Err(`File ${fullPath} does not exist!`)

    await copyFile(fullPath, makeFullPath(`../gitData/worldFiles/${file}`))
  }

  const zip = new Zip()
  zip.addLocalFolder(makeFullPath('../gitData/worldFiles'))
  zip.writeZip('../gitData/worldData.zip')
  deleteDirIfContents('../gitData/worldFiles')

  const res2 = await pushToRepo()
  if (res2.isErr()) return Err(res2.unwrapErr())

  return Ok(unit)
}

export async function uploadBulk(dir: string): Promise<Result<Unit, string>> {
  const res1 = await switchBranch('sync')
  if (res1.isErr()) return Err(res1.unwrapErr())

  const zip = new Zip()
  zip.addLocalFolder(dir)
  zip.writeZip(makeFullPath('../gitData/worldData.zip'))

  const res2 = await pushToRepo()
  if (res2.isErr()) return Err(res2.unwrapErr())

  return Ok(unit)
}

export async function download(dir: string): Promise<Result<Unit, string>> {
  const res1 = await switchBranch('sync')
  if (res1.isErr()) return Err(res1.unwrapErr())

  const res2 = await pullFromRepo()
  if (res2.isErr()) return Err(res2.unwrapErr())

  if (!existsSync(makeFullPath('../gitData/worldData.zip')))
    return Err('No zip file to download from')

  deleteDirIfContents('../gitData/worldFiles')

  createReadStream(makeFullPath('../gitData/worldData.zip'))
    .pipe(Extract({ path: makeFullPath('../gitData/worldFiles') }))
    .on('close', () => {
      const realDirName = getWorldNameFromWorldDirectory(dir)

      /**
       * Rename the old directory backup, deleting any other backup worlds
       * that we made in the past
       */

      if (existsSync(dir)) {
        const backupDirName = `backupSync${userInfo().username}`
        const backupDir = path.join(dir, '../', backupDirName)
        if (existsSync(backupDir))
            rmSync(backupDir, {recursive: true})
        renameSync(dir, backupDir)
      }

      renameSync(
        makeFullPath('../gitData/worldFiles'),
        makeFullPath(`../gitData/${realDirName}`),
      )
      cpSync(makeFullPath(`../gitData/${realDirName}`), dir, { recursive: true })
      renameSync(
        makeFullPath(`../gitData/${realDirName}`),
        makeFullPath('../gitData/worldFiles'),
      )

      deleteDirIfContents('../gitData/worldFiles')
    })

  return Ok(unit)
}
