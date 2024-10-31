import path from "path"
import { map, concatMap, catchError, of, Observable, mergeMap, tap, toArray, reduce } from "rxjs"

import json2md from 'json2md'

import { toCsvObs } from "@enrico.piccinin/csv-tools"
import { readLinesObs, writeFileObs } from "observable-fs"

import { gitDiff$ } from "../git/git-diffs"
import { explainGitDiffs$, PromptTemplates } from "../git/explain-diffs"
import { summarizeDiffs$ } from "../git/summarize-diffs"
import { comparisonResultFromClocDiffRelForProject$, ClocGitDiffRec, ComparisonParams } from "./cloc-diff-rel"

//********************************************************************************************************************** */
//****************************   APIs                               **************************************************** */
//********************************************************************************************************************** */

// FileDiffWithGitDiffsAndFileContent defines the objects containing:
// - the cloc git diff information
// - the git diff information (the diffLines returned by git diff command and the status of the file, deleted, added, copied, renamed -
//   the status is determined by the second line of the git diff command output)
// - the file content
export type FileStatus = {
    deleted: null | boolean,
    added: null | boolean,
    copied: null | boolean,
    renamed: null | boolean,
}
export type FileDiffWithGitDiffsAndFileContent = ClocGitDiffRec & FileStatus & {
    diffLines: string,
    fileContent: string,
}

export function allDiffsForProject$(
    comparisonParams: ComparisonParams,
    repoRootFolder: string,
    executedCommands: string[],
    languages?: string[]
): Observable<FileDiffWithGitDiffsAndFileContent> {
    return comparisonResultFromClocDiffRelForProject$(comparisonParams, repoRootFolder, executedCommands, languages).pipe(
        // we MUST use concatMap here to ensure that gitDiff$ is not streaming concurrently but only sequentially
        // in other words gitDiff$ must return the bufferDiffLines value before starting for the next one
        // gitDiffs$ eventually calls the command "git diff" which outputs on the stdout - gitDiffs$ Obsrvable accumulates the output
        // sent to the stdout and returns it as a buffer string (diffLinesString)
        // Using concatMap (which just mergeMap with concurrency set to 1) ensures that the command "git diff" 
        // is not executed concurrently for different projects
        concatMap(rec => {
            console.log(`Calculating git diff for ${rec.fullFilePath}`)
            return gitDiff$(
                rec.projectDir!,
                {
                    from_tag_or_branch: comparisonParams.from_tag_branch_commit,
                    to_tag_or_branch: comparisonParams.to_tag_branch_commit,
                    url_to_remote_repo: comparisonParams.url_to_remote_repo
                },
                rec.File,
                executedCommands
            ).pipe(
                map(diffLinesString => {
                    const diffLines = diffLinesString.toString()
                    const _lines = diffLines.split('\n')
                    const _rec: FileDiffWithGitDiffsAndFileContent = {
                        ...rec, diffLines, fileContent: '', deleted: null, added: null, copied: null, renamed: null
                    }
                    if (_lines.length < 2) {
                        console.log(`No diff found for file ${rec.fullFilePath}`)
                        executedCommands.push(`===>>> No diff found for file ${rec.fullFilePath}`)
                        return { ..._rec, diffLines }
                    }
                    const secondLine = _lines[1]
                    if (secondLine.startsWith('deleted file mode')) {
                        _rec.deleted = true
                    } else if (secondLine.startsWith('new file mode')) {
                        _rec.added = true
                    } else if (secondLine.startsWith('copy ')) {
                        _rec.copied = true
                    } else if (secondLine.startsWith('rename ')) {
                        _rec.renamed = true
                    }
                    return { ..._rec, diffLines }
                })
            )
        }),
        concatMap((rec: FileDiffWithGitDiffsAndFileContent & { diffLines: string }) => {
            return readLinesObs(rec.fullFilePath!).pipe(
                map(lines => {
                    return { ...rec, fileContent: lines.join('\n') } as FileDiffWithGitDiffsAndFileContent
                }),
                catchError(err => {
                    if (err.code === 'ENOENT') {
                        return of({ ...rec, fileContent: 'file not found' } as FileDiffWithGitDiffsAndFileContent)
                    }
                    throw err
                })
            )
        }),
    )
}

export type FileDiffWithExplanation = ClocGitDiffRec & FileStatus & {
    explanation: string,
}
export function allDiffsForProjectWithExplanation$(
    comparisonParams: ComparisonParams,
    repoFolder: string,
    promptTemplates: PromptTemplates,
    executedCommands: string[],
    languages?: string[],
    concurrentLLMCalls = 5
): Observable<FileDiffWithExplanation> {
    const startExecTime = new Date()
    return allDiffsForProject$(comparisonParams, repoFolder, executedCommands, languages).pipe(
        mergeMap(comparisonResult => {
            return explainGitDiffs$(comparisonResult, promptTemplates, executedCommands)
        }, concurrentLLMCalls),
        tap({
            complete: () => {
                console.log(`\n\nCompleted all diffs with explanations in ${new Date().getTime() - startExecTime.getTime()} ms\n\n`)
            }
        })
    )
}

export function writeAllDiffsForProjectWithExplanationToCsv$(
    comparisonParams: ComparisonParams,
    promptTemplates: PromptTemplates,
    repoFolder: string,
    outdir: string,
    languages?: string[]
) {
    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    const executedCommands: string[] = []

    const projectDirName = path.basename(comparisonParams.projectDir)

    return allDiffsForProjectWithExplanation$(comparisonParams, repoFolder, promptTemplates, executedCommands, languages).pipe(
        // replace any ',' in the explanation with a '-'
        map((diffWithExplanation) => {
            diffWithExplanation.explanation = diffWithExplanation.explanation.replace(/,/g, '-')
            diffWithExplanation.explanation = diffWithExplanation.explanation.replace(/;/g, ' ')
            return diffWithExplanation
        }),
        toCsvObs(),
        toArray(),
        concatMap((compareResult) => {
            const outFile = path.join(outdir, `${projectDirName}-compare-with-explanations-${timeStampYYYYMMDDHHMMSS}.csv`);
            return writeCompareResultsToCsv$(compareResult, projectDirName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${projectDirName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeExecutedCommands$(executedCommands, projectDirName, outFile)
        })
    )
}

export function writeAllDiffsForProjectWithExplanationToMarkdown$(
    comparisonParams: ComparisonParams,
    promptTemplates: PromptTemplates,
    repoFolder: string,
    outdir: string,
    languages?: string[]
) {
    const timeStampYYYYMMDDHHMMSS = new Date().toISOString().replace(/:/g, '-').split('.')[0]

    const executedCommands: string[] = []

    const projectDirName = path.basename(comparisonParams.projectDir)

    const mdJson = initializeMarkdown(comparisonParams, repoFolder, languages)

    return allDiffsForProjectWithExplanation$(comparisonParams, repoFolder, promptTemplates, executedCommands, languages).pipe(
        toArray(),
        concatMap((diffWithExplanation) => {
            appendNumFilesWithDiffsToMdJson(mdJson, diffWithExplanation.length)
            return summarizeDiffs$(diffWithExplanation, languages, projectDirName, executedCommands).pipe(
                map(summary => {
                    appendSummaryToMdJson(mdJson, summary)
                    return diffWithExplanation
                })
            )
        }),
        concatMap(diffs => diffs),
        reduce((mdJson, diffWithExplanation) => {
            appendCompResultToMdJson(mdJson, diffWithExplanation)
            return mdJson
        }, mdJson),
        tap(mdJson => {
            appendPromptsToMdJson(mdJson, promptTemplates)
        }),
        concatMap((mdJson) => {
            const outFile = path.join(outdir, `${projectDirName}-compare-with-explanations-${timeStampYYYYMMDDHHMMSS}.md`);
            return writeCompareResultsToMarkdown$(mdJson, projectDirName, outFile)
        }),
        concatMap(() => {
            const outFile = path.join(outdir, `${projectDirName}-executed-commands-${timeStampYYYYMMDDHHMMSS}.txt`);
            return writeExecutedCommands$(executedCommands, projectDirName, outFile)
        })
    )
}


//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes

const writeCompareResultsToMarkdown$ = (mdJson: any[], projectDirName: string, outFile: string) => {
    const mdAsString = json2md(mdJson)
    return writeFileObs(outFile, [mdAsString])
        .pipe(
            tap({
                next: () => console.log(`====>>>> Compare result for project ${projectDirName} written in markdown file: ${outFile}`),
            }),
        );
}

const writeCompareResultsToCsv$ = (compareResults: string[], projectDirName: string, outFile: string) => {
    return writeFileObs(outFile, compareResults)
        .pipe(
            tap({
                next: () => console.log(`====>>>> Compare result for project ${projectDirName} written in csv file: ${outFile}`),
            }),
        );
}

const writeExecutedCommands$ = (executedCommands: string[], projectDirName: string, outFile: string) => {
    return writeFileObs(outFile, executedCommands)
        .pipe(
            tap({
                next: () => console.log(`====>>>> Commands executed to calculate comparisons for project "${projectDirName}" written in txt file: ${outFile}`),
            }),
        );
}


function initializeMarkdown(
    comparisonParams: ComparisonParams,
    repoFolder: string,
    languages?: string[]
) {
    const projectDir = path.join(repoFolder, comparisonParams.projectDir)
    const inRemoteRepoMsg = comparisonParams.url_to_remote_repo ?
        ` in remote repo ${comparisonParams.url_to_remote_repo}` :
        ''

    const mdJson = [
        { h1: `Comparing ${comparisonParams.from_tag_branch_commit} with ${comparisonParams.to_tag_branch_commit}` },
        { h2: `Project directory: ${projectDir}` },
        { h4: `From Tag Branch or Commit: ${comparisonParams.from_tag_branch_commit}` },
        { h4: `To Tag Branch or Commit: ${comparisonParams.to_tag_branch_commit}${inRemoteRepoMsg}` },
        { h4: `Languages considered: ${languages?.join(', ')}` },
        { p: '' },
        { p: '------------------------------------------------------------------------------------------------' },
    ]

    return mdJson
}

function appendNumFilesWithDiffsToMdJson(
    mdJson: any[],
    numFilesWithDiffs: number
) {
    mdJson.push({ h3: `Files with differences: ${numFilesWithDiffs}` })
    mdJson.push({ p: '==========================================================================' })
}

function appendCompResultToMdJson(
    mdJson: any[],
    compareResult: FileDiffWithExplanation
) {
    const linesOfCodeInfo = `lines of code: ${compareResult.code_same} same, ${compareResult.code_modified} modified, ${compareResult.code_added} added, ${compareResult.code_removed} removed`

    mdJson.push({ p: '------------------------------------------------------------------------------------------------' })
    mdJson.push({ h3: compareResult.File })
    mdJson.push({ p: compareResult.explanation })
    mdJson.push({ p: '' })
    mdJson.push({ p: linesOfCodeInfo })
}

function appendPromptsToMdJson(
    mdJson: any[],
    promptTemplates: PromptTemplates
) {
    const promptSectionTitle = [
        { p: '===========================================================================' },
        { h2: 'Prompt Templates' }
    ]
    mdJson.push(...promptSectionTitle)

    const promptTemplatesMdJson: any[] = []

    Object.values(promptTemplates).forEach((promptWithDescription) => {
        promptTemplatesMdJson.push({ h2: promptWithDescription.description })
        promptTemplatesMdJson.push({ p: promptWithDescription.prompt })
    })

    mdJson.push(...promptTemplatesMdJson)
}

function appendSummaryToMdJson(
    mdJson: any[],
    summary: string
) {
    mdJson.push({ p: '==========================================================================' })
    mdJson.push({ h2: 'Summary of all diffs' })
    mdJson.push({ p: summary })
    mdJson.push({ p: '==========================================================================' })
    mdJson.push({ p: '==================  Differences in files' })
}