import { abort } from 'process'
import {
  areYouReallySure,
  logDebug,
  tryGetArg,
  tryGetMcDirFromJson,
  userInputOnlyValid,
} from './IO'

import { isInSync, uploadBulk } from './GitCommunication'
import { download } from 'express/lib/response'

async function main() {
  const uploadOrDownlooad = tryGetArg(0)

  if (uploadOrDownlooad.predicate((s) => s == 'up' || s == 'down')) {
    console.error('Valid inputs to this program are "[up, down]"')
    return
  }

  const mcDir = tryGetArg(1)
    .or(tryGetMcDirFromJson())
    .unwrapOrElse(() => {
      console.error(
        'Please provide your minecraft world directory as the second argument',
      )
      abort()
    })

  const isSynced = (await isInSync()).unwrap()
  if (!isSynced) {
    console.warn(
      'You current world is out of sync with the cloud version! Consider downloading',
    )
  }

  const arg = uploadOrDownlooad.unwrap()
  const answer = userInputOnlyValid(`Are you sure you want to ${arg}?`, ['y', 'n'])

  if (answer == 'y' && areYouReallySure(1)) {
    if (arg == 'up') {
      logDebug('Uploading changes to the cloud...')
      await uploadBulk(mcDir)
    } else {
      logDebug('Downloading from the cloud...')
      await download(mcDir)
    }
    return
  } else {
    logDebug('Exiting...')
  }
}

main()
