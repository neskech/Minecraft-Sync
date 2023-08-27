import { sys } from 'typescript'
import { None, Option, Some } from './Option'
import { readFileSync } from 'fs'
import { join } from 'path'


export function logDebug(...args: any) {
  console.log(...args, "color: #f2e449");
}

export function makeFullPath(file: string): string {
  return join(__dirname, file)
}

export function tryGetArg(index: number): Option<string> {
  index += 1
  if (sys.args.length > index) return Some(sys.args[index])
  return None()
}

export function userInputOnlyValid(question: string, choices: string[]): string {
  const questionStr = `${question} (${choices.join(' ')})`

  let isValidResp = false
  let response: string | null = null
  while (!isValidResp) {
    response = prompt(questionStr)
    isValidResp = choices.some((c) => response == c)
    if (!isValidResp) console.log('Please give a valid response')
  }

  return response!
}

export function areYouReallySure(areYouReallys: number): boolean {
  let question = 'are you really sure?'
  for (let i = 0; i < areYouReallys; i++) {
    const answer = userInputOnlyValid(question, ['y', 'n'])
    if (answer == 'n') return false

    question = `are you ${'really'.repeat(i + 2)} sure?`
  }

  return true
}

export function tryGetMcDirFromJson(): Option<string> {
  try {
    const content = readFileSync(makeFullPath('../gitData/minecraftDirectory.json'), { encoding: 'utf-8' })
    const result = JSON.parse(content)
    return Option.fromNull(result?.directory)
  } catch (e) {
    console.error(e)
    return None()
  }
}