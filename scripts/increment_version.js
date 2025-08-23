import fs from 'fs'
import path from 'path'

// package.json

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

// README.md

const readmePath = path.resolve('README.md')

fs.readFile(readmePath, 'utf-8', (err, data) => {
    if (err) {
        console.error('Error reading file: ', err)
        return
    }
    const updatedContent = data.replace(new RegExp(oldVersion, 'g'), newVersion)
    fs.writeFile(readmePath, updatedContent, 'utf-8', (err) => {
        if (err) {
            console.error('Error writing file: ', err)
        } else {
            console.log('String replaced successfully.')
        }
    })
})

console.log(`Updated from ${oldVersion} to ${newVersion}`)
