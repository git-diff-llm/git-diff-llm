import { expect } from 'chai';
import { toFromTagBranchCommitPrefix } from './git-diffs';

describe(`toFromTagBranchCommitPrefix`, () => {
    it(`should return the prefix when 2 tags are passed in as arguments`, () => {
        const from_tag_branch_commit = 'tags/first-tag'
        const to_tag_branch_commit = 'tags/tag-on-the-forked-repo'

        const expected_from_tag_branch_commit_prefix = 'refs/'
        const expected_to_tag_branch_commit_prefix = 'refs/'

        let remote = true
        let resp = toFromTagBranchCommitPrefix(to_tag_branch_commit, from_tag_branch_commit, remote)
        expect(resp.fromTagBranchCommitPrefix).equal(expected_from_tag_branch_commit_prefix)
        expect(resp.toTagBranchCommitPrefix).equal(expected_to_tag_branch_commit_prefix)

        remote = false
        resp = toFromTagBranchCommitPrefix(to_tag_branch_commit, from_tag_branch_commit, remote)
        expect(resp.fromTagBranchCommitPrefix).equal(expected_from_tag_branch_commit_prefix)
        expect(resp.toTagBranchCommitPrefix).equal(expected_to_tag_branch_commit_prefix)
    });

    it(`should return the prefix when 2 branches are passed in as arguments`, () => {
        const from_tag_branch_commit = 'local-branch'
        const to_tag_branch_commit = 'remote-branch'

        let remote = true
        let expected_from_tag_branch_commit_prefix = 'origin/'
        let expected_to_tag_branch_commit_prefix = 'base/'
        let resp = toFromTagBranchCommitPrefix(to_tag_branch_commit, from_tag_branch_commit, remote)
        expect(resp.fromTagBranchCommitPrefix).equal(expected_from_tag_branch_commit_prefix)
        expect(resp.toTagBranchCommitPrefix).equal(expected_to_tag_branch_commit_prefix)

        remote = false
        expected_from_tag_branch_commit_prefix = 'origin/'
        expected_to_tag_branch_commit_prefix = 'origin/'
        resp = toFromTagBranchCommitPrefix(to_tag_branch_commit, from_tag_branch_commit, remote)
        expect(resp.fromTagBranchCommitPrefix).equal(expected_from_tag_branch_commit_prefix)
        expect(resp.toTagBranchCommitPrefix).equal(expected_to_tag_branch_commit_prefix)
    });

    it(`should return the prefix when 2 commits are passed in as arguments`, () => {
        const from_tag_branch_commit = '535f140d6d9d3532e6f4018cd02ea5b4e83c8e39'
        const to_tag_branch_commit = 'aae72b42ad2a4d6a66f787e7297df455c0a2dfb6'

        const expected_from_tag_branch_commit_prefix = ''
        const expected_to_tag_branch_commit_prefix = ''

        let remote = true
        let resp = toFromTagBranchCommitPrefix(to_tag_branch_commit, from_tag_branch_commit, remote)
        expect(resp.fromTagBranchCommitPrefix).equal(expected_from_tag_branch_commit_prefix)
        expect(resp.toTagBranchCommitPrefix).equal(expected_to_tag_branch_commit_prefix)

        remote = false
        resp = toFromTagBranchCommitPrefix(to_tag_branch_commit, from_tag_branch_commit, remote)
        expect(resp.fromTagBranchCommitPrefix).equal(expected_from_tag_branch_commit_prefix)
        expect(resp.toTagBranchCommitPrefix).equal(expected_to_tag_branch_commit_prefix)
    });

    it(`should return the prefix when a commits and a branch are passed in as arguments`, () => {
        const from_tag_branch_commit = '535f140d6d9d3532e6f4018cd02ea5b4e83c8e39'
        const to_tag_branch_commit = 'a-branch'


        let remote = true
        let expected_from_tag_branch_commit_prefix = ''
        let expected_to_tag_branch_commit_prefix = 'base/'
        let resp = toFromTagBranchCommitPrefix(to_tag_branch_commit, from_tag_branch_commit, remote)
        expect(resp.fromTagBranchCommitPrefix).equal(expected_from_tag_branch_commit_prefix)
        expect(resp.toTagBranchCommitPrefix).equal(expected_to_tag_branch_commit_prefix)

        remote = false
        expected_from_tag_branch_commit_prefix = ''
        expected_to_tag_branch_commit_prefix = 'origin/'
        resp = toFromTagBranchCommitPrefix(to_tag_branch_commit, from_tag_branch_commit, remote)
        expect(resp.fromTagBranchCommitPrefix).equal(expected_from_tag_branch_commit_prefix)
        expect(resp.toTagBranchCommitPrefix).equal(expected_to_tag_branch_commit_prefix)
    });
});