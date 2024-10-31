import fs from 'fs';
import { toArray } from 'rxjs';

import { expect } from 'chai';
import {  allDiffsForProjectWithExplanation$ } from './cloc-git-diff-rel-between-tag-branch-commit';
import { PromptTemplates } from '../git/explain-diffs';
import path from 'path';
import { ComparisonParams } from './cloc-diff-rel';

describe(`allDiffsForProjectWithExplanation$`, () => {
    const repoRootFolder = './'
    const executedCommands: string[] = []
    const languages = ['Markdown', "TypeScript"]
    const promptTemplates = readPromptTemplates()

    //===================== TESTS ON LOCAL REPO =====================
    it(`should return the diffs between 2 tags of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'tags/first-tag',
            to_tag_branch_commit: 'tags/second-tag',
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 2 files between the 2 tags 
                // https://github.com/EnricoPicci/gitlab-tools/compare/first-tag...second-tag
                // for a likely bug in the command cloc --git-diff-rel the files changed are 3 and not 2 (the file README.md is counted twice)
                expect(diffs.length).equal(3)
            },
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a tag and a branch of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'tags/first-tag',
            to_tag_branch_commit: 'one-branch-on-upstream',
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 3 files of type TypeScript or Markdown between the tag and the branch
                // there is a fourth file changed but this is with extension .txt and is not counted
                // https://github.com/EnricoPicci/gitlab-tools/compare/first-tag...one-branch-on-upstream
                // for a likely bug in the command cloc --git-diff-rel the files changed are 4 and not 3 (the file README.md is counted twice)
                expect(diffs.length).equal(4)
            },
            error: (error: any) => {
                done(error)
            },
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a branch and a commit of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'one-branch-on-upstream',
            to_tag_branch_commit: 'ef0f4d45543313067ba84926102b8fa013a98932',
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 1 files of type TypeScript or Markdown between the branch and the commit
                // there is a second file changed but this is with extension .txt and is not counted
                // If you check on GitHub web client with the url 
                // https://github.com/EnricoPicci/gitlab-tools/compare/one-branch-on-upstream...ef0f4d45543313067ba84926102b8fa013a98932
                // no changes are shown, but if we switch the base and the head of the comparison we see the changes
                // https://github.com/EnricoPicci/gitlab-tools/compare/ef0f4d45543313067ba84926102b8fa013a98932...one-branch-on-upstream
                // the git diff command shows the changes correctly in both cases
                expect(diffs.length).equal(1)
            },
            error: (error: any) => {
                done(error)
            },
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a commit and a branch of the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'ef0f4d45543313067ba84926102b8fa013a98932',
            to_tag_branch_commit: 'one-branch-on-upstream',
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 1 files of type TypeScript or Markdown between the branch and the commit
                // there is a second file changed but this is with extension .txt and is not counted
                // https://github.com/EnricoPicci/gitlab-tools/compare/ef0f4d45543313067ba84926102b8fa013a98932...one-branch-on-upstream
                expect(diffs.length).equal(1)
            },
            error: (error: any) => {
                done(error)
            },
            complete: () => done()
        })
    }).timeout(100000);

    it.only(`should return the diffs between 2 commits on the local repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: '965e1e43ca3b1e834d1146f90e60bf6fb42ed88b', // older commit
            to_tag_branch_commit: '5e8d5278ec8fb203adfcca33d5bbc15fb626d71f', // newer commit
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 1 files of type TypeScript or Markdown between the 2 commits
                // https://github.com/EnricoPicci/git-diff-llm/compare/965e1e43ca3b1e834d1146f90e60bf6fb42ed88b...5e8d5278ec8fb203adfcca33d5bbc15fb626d71f
                //
                // the git web client does not show any difference if we invert the order of the commits
                // https://github.com/EnricoPicci/git-diff-llm/compare/5e8d5278ec8fb203adfcca33d5bbc15fb626d71f...965e1e43ca3b1e834d1146f90e60bf6fb42ed88b
                expect(diffs.length).equal(1)
                expect(diffs[0].File).equal('src/internals/cloc-git/cloc-git-diff-rel-between-tag-branch-commit.spec.ts')
            },
            error: (error: any) => {
                done(error)
            },
            complete: () => done()
        })
    }).timeout(100000);

    //===================== TESTS ON REMOTE REPO =====================
    // Comparison between tags, branches and commits of the local repo and the remote repo
    const url_to_remote_forked_repo = 'https://github.com/codemotion-2018-rome-rxjs-node/gitlab-tools'
    it(`should return the diffs between a tag of the local repo and a tag on the remote repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'tags/first-tag',
            to_tag_branch_commit: 'tags/tag-on-the-forked-repo',
            url_to_remote_repo: url_to_remote_forked_repo,
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 5 files between the 2 tags 
                // https://github.com/EnricoPicci/gitlab-tools/compare/first-tag...codemotion-2018-rome-rxjs-node:gitlab-tools:tag-on-the-forked-repo
                expect(diffs.length).equal(5)
            },
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);

    it(`should return the diffs between a branch of the local repo and a branch on the remote repo`, (done) => {
        const comparisonParams: ComparisonParams = {
            projectDir: './',
            from_tag_branch_commit: 'one-branch-on-upstream',
            to_tag_branch_commit: 'one-branch',
            url_to_remote_repo: url_to_remote_forked_repo,
        }
        allDiffsForProjectWithExplanation$(
            comparisonParams,
            repoRootFolder,
            promptTemplates,
            executedCommands,
            languages
        ).pipe(
            toArray()
        ).subscribe({
            next: (diffs) => {
                // there is a difference of 4 files between the 2 branches 
                // the follwoing command shows the differences correctly (5 files, but only 4 are of type TypeScript or Markdown)
                // git diff origin/one-branch-on-upstream base/one-branch --name-only
                // If we run the diff with the GitHub web client we see only 3 files of differences, which seems not correct
                // https://github.com/EnricoPicci/gitlab-tools/compare/one-branch-on-upstream...codemotion-2018-rome-rxjs-node:gitlab-tools:one-branch
                // The file with diffs that is missing from the view of the GitHub web client is the file "ts-file-added-to-second-branch.ts"
                // which is though present NOT present in the branch "one-branch" of the remote repo
                // https://github.com/codemotion-2018-rome-rxjs-node/gitlab-tools/tree/one-branch
                // but is present in the branch "one-branch-on-upstream" of the local repo
                // https://github.com/EnricoPicci/gitlab-tools/tree/one-branch-on-upstream
                // which would bring us to expect 4 files of differences
                expect(diffs.length).equal(4)
            },
            error: (error: any) => done(error),
            complete: () => done()
        })
    }).timeout(100000);
});

function readPromptTemplates() {
    const promptTemplateFileChanged = "/prompts/explain-diff.txt";
    const promptTemplateFileAdded = "/prompts/explain-added.txt";
    const promptTemplateFileRemoved = "/prompts/explain-removed.txt";
    const currentDir = process.cwd();

    console.log(`currentDir: ${currentDir}`);
    const _promptTemplateFileChanged = path.join(currentDir, promptTemplateFileChanged);
    const promptChanged = fs.readFileSync(_promptTemplateFileChanged, 'utf-8');
    const _promptTemplateFileAdded = path.join(currentDir, promptTemplateFileAdded);
    const promptAdded = fs.readFileSync(_promptTemplateFileAdded, 'utf-8');
    const _promptTemplateFileRemoved = path.join(currentDir, promptTemplateFileRemoved);
    const promptRemoved = fs.readFileSync(_promptTemplateFileRemoved, 'utf-8');

    const promptTemplates: PromptTemplates = {
        changedFile: { prompt: promptChanged, description: 'Prompt to summarize the changes in a file' },
        addedFile: { prompt: promptAdded, description: 'Prompt to summarize a file that has been added' },
        removedFile: { prompt: promptRemoved, description: 'Prompt to summarize a file that has been removed' }
    }
    return promptTemplates
}