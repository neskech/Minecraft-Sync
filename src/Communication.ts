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
import Unzip, { Extract } from 'unzipper'
import path from 'path'
import { copyFile } from 'fs/promises'
import down from 'download'
import { readFileSync } from 'fs'
import { userInfo } from 'os'
import { logDebug } from './FileWatcher'

function makeFullPath(file: string): string {
  return path.join(__dirname, file)
}

function deleteDirIfContents(dir: string) {
  const toDelete = readdirSync(makeFullPath(dir))
  for (const file of toDelete) {
    unlinkSync(makeFullPath(`${dir}/${file}`))
  }
}

async function deleteFileFromDrive(name: string): Promise<boolean> {
  try {
    const res = await drive.files.list({
      q: `name='${name}'`,
      spaces: 'drive',
      alt: 'media',
    })

    if (!res.data.files) return false
    const file = res.data.files[0]
    if (!file.id) return false

    const response = await drive.files.delete({ fileId: file.id })

    logDebug(`Success deleting file ${name} with response ${response.data}`)
    return true
  } catch (e) {
    console.error(e)
    return false
  }
}
async function downloadFileOfName(
  name: string,
  destination: string,
): Promise<Result<Unit, string>> {
  try {
    const res = await drive.files.list({
      q: `name='${name}'`,
      spaces: 'drive',
      alt: 'media',
    })

    if (!res.data.files) return Err(`Could not find file of name ${name}`)

    const file = res.data.files[0]
    if (!file.webContentLink) return Err(`Content link on file ${name} does not exist`)

    down(file.webContentLink, makeFullPath(destination))
    return Ok(unit)
  } catch (e) {
    return Err((e as Error).message)
  }
}

config()
let drive: drive_v3.Drive

export async function signalPlayerOnline() {
  const result = await downloadFileOfName('playerData', '../data/misc/playerData.json')

  if (result.isErr()) {
    console.error(result.unwrapErr())
    deleteDirIfContents('../data/misc/')
    return false
  }

  const content = readFileSync(makeFullPath('../data/misc/playerData.json'), {
    encoding: 'utf-8',
  })
  const json = JSON.parse(content)

  json[`${userInfo().uid}`] = true

  deleteDirIfContents('../data/misc/')

  try {
    deleteFileFromDrive('playerData')
    const response = await drive.files.create({
      requestBody: {
        name: 'playerData',
        mimeType: 'application/json',
      },
      media: {
        mimeType: 'application/json',
        body: JSON.stringify(json),
      },
    })

    logDebug(`Signaled offline with response ${response.data}....`)
  } catch (e) {
    console.error(e)
  }
}

export async function signalPlayerOffline() {
  const result = await downloadFileOfName('playerData', '../data/misc/playerData.json')

  if (result.isErr()) {
    console.error(result.unwrapErr())
    deleteDirIfContents('../data/misc/')
    return false
  }

  const content = readFileSync(makeFullPath('../data/misc/playerData.json'), {
    encoding: 'utf-8',
  })
  const json = JSON.parse(content)

  json[`${userInfo().uid}`] = false

  deleteDirIfContents('../data/misc/')

  try {
    deleteFileFromDrive('playerData')
    const response = await drive.files.create({
      requestBody: {
        name: 'playerData',
        mimeType: 'application/json',
      },
      media: {
        mimeType: 'application/json',
        body: JSON.stringify(json),
      },
    })

    logDebug(`Signaled offline with response ${response.data}....`)
  } catch (e) {
    console.error(e)
  }
}

export async function isAnotherPlayerOnline(): Promise<boolean> {
  const result = await downloadFileOfName('playerData', '../data/misc/playerData.json')

  if (result.isErr()) {
    console.error(result.unwrapErr())
    deleteDirIfContents('../data/misc/')
    return false
  }

  const content = readFileSync(makeFullPath('../data/misc/playerData.json'), {
    encoding: 'utf-8',
  })
  const json = JSON.parse(content)

  deleteDirIfContents('../data/misc/')

  return json[`${userInfo().uid}`] ?? false
}

export async function upload(
  dir: string,
  files: string[],
): Promise<Result<Unit, string>> {
  /**TODO: The files here do not have nested directory paths, just names Plus you need to filter direcvtories in the watcher*/
  for (const file of files) {
    const fullPath = path.join(dir, file)

    if (!existsSync(fullPath)) return Err(`File ${fullPath} does not exist!`)

    await copyFile(fullPath, path.join(__dirname, `../data/worldFiles/${file}`))
  }

  const zip = new Zip()
  zip.addLocalFolder('../data/worldFiles/')
  zip.writeZip('../data/zip/upload.zip')
  deleteDirIfContents('../data/worldFiles/')

  try {
    deleteFileFromDrive('worldData')
    const response = await drive.files.create({
      requestBody: {
        name: 'minecraftPayload',
        mimeType: 'application/zip',
      },
      media: {
        mimeType: 'application/zip',
        body: createReadStream('../data/zip/upload.zip'),
      },
    })

    debuglog(`Upload succeeded with response ${response.data}`)
    return Ok(unit)
  } catch (e) {
    return Err((e as Error).message)
  }
}

export async function download(dir: string): Promise<Result<Unit, string>> {
  deleteDirIfContents('../data/worldFiles/')
  deleteDirIfContents('../data/zip/')

  const res = await downloadFileOfName('worldData', '../data/zip/worldData.zip')
  if (res.isErr()) return res

  createReadStream(makeFullPath('../data/zip/worldData.zip')).pipe(
    Extract({ path: makeFullPath('../data/worldFiles') }),
  )

  const unZipped = readdirSync(makeFullPath('../data/worldFiles/'))
  for (const file of unZipped) {
    const fullPath = path.join(__dirname, `../data/worldFiles/${file}`)
    /** TODO: Again this needs to be full file sub path not just name */
    copyFileSync(fullPath, `${dir}/${file}`)
  }

  return Ok(unit)
}

export async function authorize() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI,
  )
  drive = google.drive({
    version: 'v3',
    auth: oauth2Client,
  })
}
