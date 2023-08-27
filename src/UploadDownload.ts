import { abort } from "process"
import { logDebug } from "./FileWatcher"
import { areYouReallySure, tryGetArg, tryGetFileData, tryGetMcDirFromJson, userInputOnlyValid } from "./IO"
import { download, upload } from "./Communication"

async function main() {
    const uploadOrDownlooad = tryGetArg(0)

    if (uploadOrDownlooad.predicate((s) => s == 'up' || s == 'down')) {
        console.error('Valid inputs to this program are "[up, down]"')
        return
    }

    const mcDir = tryGetArg(1).or(tryGetMcDirFromJson()).unwrapOrElse(() => {
        console.error('Please provide your minecraft world directory as the second argument')
        abort()
    })

    const arg = uploadOrDownlooad.unwrap()
    const answer = userInputOnlyValid(`Are you sure you want to ${arg}?`, ['y', 'n'])

    if (answer == 'y' && areYouReallySure(1)) {
        if (arg == 'up') {
            logDebug('Uploading changes to the cloud...')

            const files = tryGetFileData().unwrapOrElse(() => {
                console.error('There are no changes to upload')
                abort()
            })
            
            await upload(mcDir, files.map(f => f.name))
        }
        else {
            logDebug('Downloading from the cloud...')
            await download(mcDir)
        }
        return
    }
    else {
        logDebug('Exiting...')
    }

}

main()