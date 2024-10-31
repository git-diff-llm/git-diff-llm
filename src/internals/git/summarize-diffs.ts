import { catchError, of } from "rxjs";
import { FileDiffWithExplanation } from "../cloc-git/cloc-git-diff-rel-between-tag-branch-commit";
import { getFullCompletion$ } from "../openai/openai";
import { fillPromptTemplateSummarizeDiffs, SummarizeDiffsPromptTemplateData } from "../openai/prompt-templates";

export function summarizeDiffs$(
    compareResults: FileDiffWithExplanation[],
    languages: string[] | undefined,
    project: string,
    executedCommands: string[]
) {
    const diffs: string[] = []
    compareResults.forEach(compareResult => {
        const changeType = compareResult.added ? 'added' : compareResult.deleted ? 'removed' : compareResult.renamed ? 'renamed' : 'changed'
        diffs.push(`File path: ${compareResult.File} - type of diff: ${changeType}`)
        diffs.push(compareResult.explanation)
        diffs.push('')
        diffs.push('---------------------------------------------------------------------------------------------')
        diffs.push('')
    })

    let languageSpeciliation = ''
    if (languages) {
        languageSpeciliation = languages.join(', ')
    }
    const templateData: SummarizeDiffsPromptTemplateData = {
        languages: languageSpeciliation,
        diffs: diffs.join('\n')
    }

    const promptForSummary = fillPromptTemplateSummarizeDiffs(promptForSummaryTemplate, templateData)

    console.log(`Calling LLM to summarize all diffs for the project ${project}`)
    return getFullCompletion$(promptForSummary).pipe(
        catchError(err => {
            const errMsg = `===>>> Error calling LLM to summarize all diffs for the project ${project} - ${err.message}`
            console.log(errMsg)
            executedCommands.push(errMsg)
            return of('error in calling LLM to explain diffs')
        }),
    )
}


const promptForSummaryTemplate = `
You are an expert developer with 10 years of experience. You are expert in many programming languages {{languages}}.
You have to examine the changes that occurred the to a Project from one version to the next and write a short summary of these changes.

This is the list of the files which have been changed, a note on whether the file has been changed, removed, added or renamed, and a short summary of the changes in each file:

{{diffs}}

`