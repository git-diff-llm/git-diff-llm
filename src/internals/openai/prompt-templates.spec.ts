import { expect } from 'chai';
import { fillPromptTemplate, fillPromptTemplateFromFile } from './prompt-templates';

describe(`fillPromptTemplate`, () => {
    it(`should fill the prompt template`, () => {
        const template = "Hello, {{name}}! I am {{age}} years old.";
        const templateData = {
            name: "John",
            age: 30
        };
        const expectedFilledTemplate = "Hello, John! I am 30 years old.";

        const templateFilled = fillPromptTemplate(template, templateData);

        expect(templateFilled).to.equal(expectedFilledTemplate);
    });
});

describe(`fillPromptTemplateFromFile`, () => {
    it(`should fill the prompt template read from a file`, () => {
        const _cwd = process.cwd();
        const templateFile = "/prompts/explain-diff.txt";
        const templateFileFullPath = `${_cwd}${templateFile}`;
        const templateData = {
            language: "Java",
            fileName: "my-file.java",
            fileContent: "public class MyClass { }",
            diffs: "Come diffs from git diff command"
        };

        const templateFilled = fillPromptTemplateFromFile(templateFileFullPath, templateData);

        expect(templateFilled.includes(templateData.fileName)).to.be.true;
        expect(templateFilled.includes(templateData.fileContent)).to.be.true;
        expect(templateFilled.includes(templateData.diffs)).to.be.true;
    });
});