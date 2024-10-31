import fs from 'fs';

export type ExplainDiffPromptTemplateData = {
    language: string;
    fileName: string;
    fileContent: string;
    diffs: string;
};
export function fillPromptTemplateExplainDiffFromFile(templateFile: string, templateData: ExplainDiffPromptTemplateData) {
    const template = fs.readFileSync(templateFile, 'utf-8');
    return fillPromptTemplateExplainDiff(template, templateData);
}
export function fillPromptTemplateExplainDiff(template: string, templateData: ExplainDiffPromptTemplateData) {
    return fillPromptTemplate(template, templateData);
}

export type SummarizeDiffsPromptTemplateData = {
    languages: string;
    diffs: string;
};
export function fillPromptTemplateSummarizeDiffsFromFile(templateFile: string, templateData: SummarizeDiffsPromptTemplateData) {
    const template = fs.readFileSync(templateFile, 'utf-8');
    return fillPromptTemplateSummarizeDiffs(template, templateData);
}
export function fillPromptTemplateSummarizeDiffs(template: string, templateData: SummarizeDiffsPromptTemplateData) {
    return fillPromptTemplate(template, templateData);
}

// functions used to get pieces of data to be used to fill in the prompt templates
export function languageFromExtension(extension: string) {
    let language = ''
    // if the extension is .java, we can assume that the language is java
    // if the extension is .ts, we can assume that the language is TypeScript
    // Use a switch statement to handle other languages
    switch (extension) {
        case '.java':
            language = 'java'
            break
        case '.ts':
            language = 'TypeScript'
            break
        default:
            language = ''
    }
    return language;
}


//********************************************************************************************************************** */
//****************************               Internals              **************************************************** */
//********************************************************************************************************************** */
// these functions may be exported for testing purposes

export function fillPromptTemplate(template: string, templateData: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, p1) => templateData[p1] || match);
}

export function fillPromptTemplateFromFile(templateFile: string, templateData: any): string {
    const template = fs.readFileSync(templateFile, 'utf-8');
    return fillPromptTemplate(template, templateData);
}