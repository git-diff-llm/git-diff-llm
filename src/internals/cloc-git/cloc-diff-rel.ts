import path from "path"

import { filter, skip, startWith, map, concatMap } from "rxjs"

import { fromCsvObs } from "@enrico.piccinin/csv-tools"

import { executeCommandNewProcessToLinesObs } from "../execute-command/execute-command"
import { cdToProjectDirAndAddRemote$ } from "../git/add-remote"
import { toFromTagBranchCommitPrefix } from "../git/git-diffs"

export type ClocGitDiffRec = {
    File: string
    blank_same: string
    blank_modified: string
    blank_added: string
    blank_removed: string
    comment_same: string
    comment_modified: string
    comment_added: string
    comment_removed: string
    code_same: string
    code_modified: string
    code_added: string
    code_removed: string,
    projectDir: string,
    fullFilePath: string
    extension: string
}
export type ComparisonParams = {
    projectDir: string
    from_tag_branch_commit: string
    to_tag_branch_commit: string
    url_to_remote_repo?: string
    use_ssh?: boolean
}
export function comparisonResultFromClocDiffRelForProject$(
    comparisonParams: ComparisonParams, repoRootFolder: string, executedCommands: string[], languages?: string[]
) {
    const projectDir = path.join(repoRootFolder, comparisonParams.projectDir)
    const header = 'File,blank_same,blank_modified,blank_added,blank_removed,comment_same,comment_modified,comment_added,comment_removed,code_same,code_modified,code_added,code_removed'
    return clocDiffRel$(
        projectDir,
        {
            from_tag_or_branch: comparisonParams.from_tag_branch_commit,
            to_tag_or_branch: comparisonParams.to_tag_branch_commit,
            url_to_remote_repo: comparisonParams.url_to_remote_repo,
            languages
        },
        executedCommands
    ).pipe(
        filter(line => line.trim().length > 0),
        // skip the first line which is the header line
        // File, == blank, != blank, + blank, - blank, == comment, != comment, + comment, - comment, == code, != code, + code, - code, "github.com/AlDanial/cloc v 2.00 T=0.0747981071472168 s"
        skip(1),
        // start with the header line that we want to have
        startWith(header),
        map(line => {
            // remove trailing comma without using regular expressions
            const _line = line.trim()
            if (_line.endsWith(',')) {
                return _line.slice(0, -1)
            }
            return _line
        }),
        fromCsvObs<ClocGitDiffRec>(','),
        map(rec => {
            const fullFilePath = path.join(projectDir, rec.File)
            const extension = path.extname(fullFilePath)
            const recWithPojectDir = { ...rec, projectDir, fullFilePath, extension }
            return recWithPojectDir
        })
    )
}

//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes

// this stream is not safe in concurrent execution and therefore shouls NOT be called by operators that work concurrently
// e.g. mergeMap
function clocDiffRel$(
    projectDir: string,
    fromToParams: { from_tag_or_branch: string, to_tag_or_branch: string, url_to_remote_repo?: string, languages?: string[] },
    executedCommands: string[]
) {
    return cdToProjectDirAndAddRemote$(
        projectDir,
        fromToParams,
        executedCommands
    ).pipe(
        concatMap(() => {
            const to_tag_branch_commit = fromToParams.to_tag_or_branch
            const from_tag_branch_commit = fromToParams.from_tag_or_branch
            // `cloc --git-diff-rel --csv --by-file base/${upstream_repo_tag_or_branch} origin/${fork_tag_or_branch}`
            const command = `cloc`
            const compareWithRemote = fromToParams.url_to_remote_repo ? true : false
            const prefixes = toFromTagBranchCommitPrefix(to_tag_branch_commit, from_tag_branch_commit, compareWithRemote)
            const args = [
                '--git-diff-rel',
                '--csv',
                '--by-file',
                `${prefixes.fromTagBranchCommitPrefix}${from_tag_branch_commit}`,
                `${prefixes.toTagBranchCommitPrefix}${to_tag_branch_commit}`
            ]

            if (fromToParams.languages && fromToParams.languages?.length > 0) {
                const languagesString = fromToParams.languages.join(',');
                args.push(`--include-lang=${languagesString}`);
            }
            const options = {
                cwd: projectDir
            }
            return executeCommandNewProcessToLinesObs(
                'run cloc --git-diff-rel --csv --by-file', command, args, options, executedCommands
            )
        })
    )
}