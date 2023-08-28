import { config } from 'dotenv'
import { GoogleApis, drive_v3, google, oauth2_v2 } from 'googleapis'
import { Err, Ok, Result, Unit, unit } from '../lib/Result'
import {
  copyFileSync,
  cpSync,
  createReadStream,
  existsSync,
  mkdir,
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
import { copySync, mkdirsSync, moveSync } from 'fs-extra'
import {
  deleteDirIfContents,
  execCommand,
  getCurrentBranchName,
  makeFullPath,
} from './IO'

function isServerDirectory(filesDir: string): boolean {
  const subFiles = readdirSync(filesDir)
  return (
    subFiles.includes('world') &&
    subFiles.includes('world_nether') &&
    subFiles.includes('world_the_end')
  )
}

function allExist(dirs: string[]): boolean {
  return dirs.every((d) => existsSync(d))
}

function getWorldNameFromWorldDirectory(dir: string): string {
  return dir.substring(dir.lastIndexOf('/') + 1)
}

async function pullFromRepo(syncDir: string): Promise<Result<Unit, string>> {
  const branchName = await getCurrentBranchName(syncDir)
  if (branchName.isErr()) return Err(branchName.unwrapErr())

  const result = await execCommand(
    `cd ${syncDir} && git reset --hard ${branchName.unwrap()}`,
  )

  if (result.isErr()) return Err(result.unwrapErr())

  return Ok(unit)
}

async function pushToRepo(syncDir: string): Promise<Result<Unit, string>> {
  const branchName = await getCurrentBranchName(syncDir)
  if (branchName.isErr()) return Err(branchName.unwrapErr())

  const result = await execCommand(
    `cd ${syncDir} && git add . && git commit -m "sync" && git push origin ${branchName.unwrap()}`,
  )

  if (result.isErr()) return Err(result.unwrapErr())

  return Ok(unit)
}

export async function isInSync(syncDir: string): Promise<Result<boolean, string>> {
  const res1 = await execCommand('cd gitData && git pull origin sync')
  if (res1.isErr()) return Err(res1.unwrapErr())

  const out = res1.unwrap()
  const result = out.toLowerCase().includes('already up to date')

  return Ok(result)
}

export async function signalPlayerOnline(
  syncDir: string,
  username: string,
): Promise<Result<Unit, string>> {
  const res1 = await pullFromRepo(syncDir)
  if (res1.isErr()) {
    return Err(res1.unwrapErr())
  }

  if (!existsSync(`${syncDir}/playerData.json`))
    return Err('Unable to signal yourself as online')

  const content = readFileSync(`${syncDir}/playerData.json`, {
    encoding: 'utf-8',
  })
  const json = JSON.parse(content) as Record<string, boolean>
  json[username] = true

  writeFileSync(`${syncDir}/playerData.json`, JSON.stringify(json))

  const res2 = await pushToRepo(syncDir)
  if (res2.isErr()) {
    return Err(res2.unwrapErr())
  }

  return Ok(unit)
}

export async function signalPlayerOffline(syncDir: string, username: string) {
  const res1 = await pullFromRepo(syncDir)
  if (res1.isErr()) {
    return Err(res1.unwrapErr())
  }

  if (!existsSync(`${syncDir}/playerData.json`))
    return Err('Unable to signal yourself as offline')

  const content = readFileSync(`${syncDir}/playerData.json`, {
    encoding: 'utf-8',
  })
  const json = JSON.parse(content) as Record<string, boolean>
  json[username] = false

  writeFileSync(`${syncDir}/playerData.json`, JSON.stringify(json))

  const res3 = await pushToRepo(syncDir)
  if (res3.isErr()) {
    return Err(res3.unwrapErr())
  }

  return Ok(unit)
}

export async function getOtherPlayersOnline(
  syncDir: string,
): Promise<Result<string[], string>> {
  const res1 = await pullFromRepo(syncDir)
  if (res1.isErr()) {
    return Err(res1.unwrapErr())
  }

  if (!existsSync(`${syncDir}/playerData.json`))
    return Err('Unable to verify prescence of other players')

  const content = readFileSync(`${syncDir}/playerData.json`, {
    encoding: 'utf-8',
  })
  const json = JSON.parse(content) as Record<string, boolean>

  return Ok(Object.keys(json).filter((k) => json[k]))
}

export async function uploadBulk(
  dir: string,
  syncDir: string,
  isServer: boolean,
): Promise<Result<Unit, string>> {
  const zip = new Zip()
  if (isServer) {
    zip.addLocalFolder(`${dir}/world`)
    zip.addLocalFolder(`${dir}/world_nether`)
    zip.addLocalFolder(`${dir}/world_the_end`)
  } else {
    zip.addLocalFolder(dir)
  }
  zip.writeZip(`${syncDir}/worldData.zip`)

  const res1 = await pushToRepo(syncDir)
  if (res1.isErr()) return Err(res1.unwrapErr())

  return Ok(unit)
}

export async function download(
  dir: string,
  syncDir: string,
  isDestinationServer: boolean,
): Promise<Result<Unit, string>> {
  const res1 = await pullFromRepo(syncDir)
  if (res1.isErr()) return Err(res1.unwrapErr())

  if (!existsSync(`${syncDir}/worldData.zip`)) return Err('No zip file to download from')

  deleteDirIfContents('../gitData/worldFiles')

  createReadStream(`${syncDir}/worldData.zip`)
    .pipe(Extract({ path: `${syncDir}/wolrdFiles` }))
    .on('close', () => {
      const worldName = getWorldNameFromWorldDirectory(dir)
      const isSourceServer = isServerDirectory(`${syncDir}/wolrdFiles`)

      /**
       * Rename the old directory backup, deleting any other backup worlds
       * that we made in the past
       */
      if (!isDestinationServer && existsSync(dir)) {
        const backupDirName = `backupSync${userInfo().username}`
        const backupDir = path.join(dir, '../', backupDirName)
        if (existsSync(backupDir)) rmSync(backupDir, { recursive: true })
        renameSync(dir, backupDir)
      } else if (isDestinationServer) {
        console.log('TODO')
      }

      if (isSourceServer && !isDestinationServer) {
        /**
         * Move the DIM files from the nether and the end into
         * the main world folder. Then move that folder over into
         * the singleplayer directory
         */
        moveSync(
          `${syncDir}/wolrdFiles/world_nether/DIM1`,
          `${syncDir}/wolrdFiles/world/DIM1`,
        )
        moveSync(
          `${syncDir}/wolrdFiles/world_the_end/DIM-1`,
          `${syncDir}/wolrdFiles/world/DIM-1`,
        )
        renameSync(`${syncDir}/wolrdFiles/world`, `${syncDir}/wolrdFiles/${worldName}`)
        moveSync(`${syncDir}/wolrdFiles/${worldName}`, dir)
      } else if (!isSourceServer && isDestinationServer) {
        /**
         * Move DIM1 (nether) and DIM-1 (end) directly into the server folders.
         * Then, once those folders are gone, move over the entire folder. Rename
         * the worldFiles folder to just world so we can replace
         */
        moveSync(`${syncDir}/wolrdFiles/DIM1`, `${dir}/world_nether`, {
          overwrite: true,
        })
        moveSync(`${syncDir}/wolrdFiles/DIM-1`, `${dir}/world_the_end`, {
          overwrite: true,
        })

        renameSync(`${syncDir}/wolrdFiles`, `${syncDir}/world`)
        moveSync(`${syncDir}/world`, dir, {
          overwrite: true,
        })
        renameSync(`${syncDir}/world`, `${syncDir}/wolrdFiles`)
      } else if (isSourceServer && isDestinationServer) {
        moveSync(`${syncDir}/wolrdFiles/world`, dir, { overwrite: true })
        moveSync(`${syncDir}/wolrdFiles/world_nether`, dir, { overwrite: true })
        moveSync(`${syncDir}/wolrdFiles/world_the_end`, dir, { overwrite: true })
      } else {
        renameSync(`${syncDir}/wolrdFiles`, `${syncDir}/${worldName}`)
        moveSync(`${syncDir}/${worldName}`, path.join(dir, '../'), { overwrite: true })
        mkdirsSync(`${syncDir}/wolrdFiles`)
      }

      deleteDirIfContents(`${syncDir}/wolrdFiles`)
    })

  return Ok(unit)
}
