import fs from 'fs'
import path from 'path'

const releaseType = process.argv[2]

const packageJsonPath = path.resolve('package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
const oldVersion = packageJson.version

const versionParts = oldVersion.split('.')
const major = parseInt(versionParts[0], 10)
const minor = parseInt(versionParts[1], 10)
const patch = parseInt(versionParts[2], 10)
let newVersion = oldVersion

switch (releaseType) {
    case 'major':
        newVersion = `${major + 1}.0.0`
        break
    case 'minor':
        newVersion = `${major}.${minor + 1}.0`
        break
    case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`
        break
    default:
        console.error('Invalid release type')
        process.exit(1)
}

packageJson.version = newVersion
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4), 'utf-8')

console.log(`Updated from ${oldVersion} to ${newVersion}`)
