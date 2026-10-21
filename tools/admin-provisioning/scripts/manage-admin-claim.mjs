import { realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { parseArguments, updateRoleClaim } from '../claims.js'

const expectedProjectId = 'fitzone-b67b2'
const projectRoot = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)))

function assertExternalCredentialFile() {
  const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!configuredPath) return

  let credentialPath
  try {
    credentialPath = realpathSync(configuredPath)
  } catch {
    throw new Error('The configured Google Application Credentials file is unavailable.')
  }

  const relativePath = path.relative(projectRoot, credentialPath)
  const credentialIsInsideProject = relativePath === ''
    || (!path.isAbsolute(relativePath)
      && relativePath !== '..'
      && !relativePath.startsWith(`..${path.sep}`))
  if (credentialIsInsideProject) {
    throw new Error('Credential files must be stored outside the project directory.')
  }
}

async function confirmAction(action, uid, project) {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('Interactive confirmation is required; no claim was changed.')
  }

  const verb = action === 'grant' ? 'GRANT ADMIN CLAIM TO' : 'REVOKE ADMIN CLAIM FROM'
  const expected = `${verb} ${uid} IN PROJECT ${project}`
  const prompt = createInterface({ input: stdin, output: stdout })
  try {
    const answer = await prompt.question(`Type exactly "${expected}" to continue: `)
    if (answer.trim() !== expected) {
      throw new Error('Confirmation did not match; no claim was changed.')
    }
  } finally {
    prompt.close()
  }
}

async function main() {
  let options
  try {
    options = parseArguments(process.argv.slice(2))
  } catch (error) {
    console.error(`${error.message}\nUsage: node scripts/manage-admin-claim.mjs --action <grant|revoke> --project fitzone-b67b2 --uid <AUTH_UID>`)
    process.exitCode = 2
    return
  }

  if (options.project !== expectedProjectId) {
    console.error('Project mismatch; no claim was changed.')
    process.exitCode = 2
    return
  }

  try {
    assertExternalCredentialFile()
    const app = initializeApp({
      credential: applicationDefault(),
      projectId: expectedProjectId,
    }, 'fitzone-admin-claim-provisioning')
    const auth = getAuth(app)

    try {
      await auth.getUser(options.uid)
    } catch (error) {
      if (error?.code === 'auth/user-not-found') {
        throw new Error('The specified Authentication UID does not exist; no claim was changed.')
      }
      throw new Error('Firebase Authentication access failed while verifying the UID; check ADC, project selection, and IAM permissions. No claim was changed.')
    }

    await confirmAction(options.action, options.uid, options.project)

    const user = await auth.getUser(options.uid)
    const existingClaims = user.customClaims || {}
    if (options.action === 'grant' && existingClaims.role === 'admin') {
      console.log('The target already has the admin claim; no change was needed.')
      return
    }
    if (options.action === 'revoke' && !Object.hasOwn(existingClaims, 'role')) {
      console.log('The target has no role claim; no change was needed.')
      return
    }

    await auth.setCustomUserClaims(
      options.uid,
      updateRoleClaim(options.action, existingClaims),
    )

    const verifiedUser = await auth.getUser(options.uid)
    const claimVerified = options.action === 'grant'
      ? verifiedUser.customClaims?.role === 'admin'
      : !Object.hasOwn(verifiedUser.customClaims || {}, 'role')
    if (!claimVerified) {
      throw new Error('The claim change could not be verified. Check the account using an authorized process.')
    }

    console.log(`Admin claim ${options.action === 'grant' ? 'granted' : 'revoked'} and verified for the specified UID in ${expectedProjectId}.`)
  } catch (error) {
    console.error(error.message || 'Provisioning failed; no further details are available.')
    process.exitCode = 1
  }
}

await main()
