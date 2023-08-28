import { sys } from 'typescript'
import { None, Option, Some } from './Option'
import { readFileSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { Err, Ok, Result, Unit, unit } from './Result'
import color from 'cli-color'
const prompt_ = require('prompt-sync')({ sigint: true })

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
  const result = await execCommand(`java src/Main.java ${content} ${title}`)
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

export function tryGetMcDirFromJson(): Option<string> {
  try {
    const content = readFileSync(makeFullPath('../gitData/minecraftDirectory.json'), {
      encoding: 'utf-8',
    })
    const result = JSON.parse(content)
    return Option.fromNull(result?.directory)
  } catch (e) {
    console.error(e)
    return None()
  }
}
