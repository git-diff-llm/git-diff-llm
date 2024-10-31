import { catchError, of, EMPTY } from "rxjs"
import { executeCommandObs$ } from "../execute-command/execute-command"
import { convertHttpsToSshUrl } from "./convert-ssh-https-url"


export function cdToProjectDirAndAddRemote$(
    projectDir: string,
    fromToParams: { url_to_remote_repo?: string, use_ssh?: boolean },
    executedCommands: string[]
) {
    const baseRemoteName = 'base'
    const url_to_remote_repo = fromToParams.url_to_remote_repo
    let commandIfRemoteExists = ''
    if (url_to_remote_repo) {
        // convert to ssh url if required (e.g. to avoid password prompts)
        let remoteUrl = url_to_remote_repo
        if (fromToParams.use_ssh) {
            remoteUrl = convertHttpsToSshUrl(url_to_remote_repo)
        }
        // the command must add git fetch the remote after the remote has been added
        commandIfRemoteExists = ` && git remote add ${baseRemoteName} ${remoteUrl} && git fetch ${baseRemoteName} --tags`
    }
    const command = `cd ${projectDir} && git fetch --all --tags ${commandIfRemoteExists}`

    return executeCommandObs$('cd to project directory and add base remote', command, executedCommands).pipe(
        catchError((err) => {
            // if the remote base already exists, we can ignore the error
            if (err.message.includes(`remote ${baseRemoteName} already exists`)) {
                return of(null)
            }
            // if the project directory does not exist, we can ignore the error
            // it may be that thre is a new forked project in gitlab which has not been cloned yet
            // in this case we can ignore the error but complete the observable to avoid that the
            // next observable in the chain executes the cloc command
            if (err.message.includes(`Command failed: cd`)) {
                console.log(`Project directory ${projectDir} does not exist`)
                executedCommands.push(`===>>> Error: Project directory ${projectDir} does not exist`)
                return EMPTY
            }
            throw (err)
        }),
    )
}