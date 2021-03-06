import fs from 'fs'
import path from 'path'
import env from 'node-env-file'
import { createBrowser } from 'tib'
import { browserString, useBrowserstackLocal } from '.'

export function startBrowser ({ folder, port, globalName, extendPage = {} }) {
  if (useBrowserstackLocal) {
    const envFile = path.resolve(__dirname, '..', '..', '.env-browserstack')

    if (fs.existsSync(envFile)) {
      env(envFile)
    }
  }

  globalName = `$${globalName}`

  return createBrowser(browserString, {
    staticServer: {
      folder,
      port
    },
    extendPage (page) {
      return {
        async navigate (path) {
          await page.runAsyncScript((path, globalName) => {
            if (!window[globalName]) {
              console.error('window.'.concat(globalName, ' does not exists'))
            }

            return new Promise((resolve) => {
              // timeout after 10s
              const timeout = setTimeout(function () {
                console.error('browser: nuxt navigation timed out')
                window[globalName].$emit('routeChanged')
              }, 10000)

              window[globalName].$once('routeChanged', () => {
                clearTimeout(timeout)
                setTimeout(resolve, 250)
              })
              window[globalName].$router.push(path)
            })
          }, path, globalName)
        },
        routeData () {
          return page.runScript(() => ({
            path: window.$nuxt.$route.path,
            query: window.$nuxt.$route.query
          }))
        },
        ...extendPage
      }
    }
  })
}
