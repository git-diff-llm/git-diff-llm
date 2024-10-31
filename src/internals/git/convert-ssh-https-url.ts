
// convertHttpToSshUrl is a function that converts a http url to a ssh url
export function convertHttpsToSshUrl(httpUrl: string) {
    const parts = httpUrl.split('//')
    if (parts.length !== 2) {
        throw new Error(`Invalid url ${httpUrl}`)
    }
    const url = parts[1]
    const urlParts = url.split('/')
    const firstUrlPart = urlParts[0]
    const otherUrlParts = urlParts.slice(1)
    const projectUrl = otherUrlParts.join('/')
    return `git@${firstUrlPart}:${projectUrl}`
}