import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, loadEnv } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd())

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@main': resolve('src/main')
        }
      },
    },

    preload: {
      plugins: [externalizeDepsPlugin()],
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@main': resolve('src/main')
        }
      },
    },

    renderer: {
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@main': resolve('src/main')
        }
      },
      plugins: [vue()],
      server: {
        hmr: true,
        port: 7969,
        proxy: {
          '/api': {
            // 使用从环境变量加载的值
            target: env.VITE_REQUEST_URL,
            ws: true,
            secure: false,
            changeOrigin: true,
            rewrite: path => path.replace(/^\/api/, '')
          }
        }
      }
    }
  }
})
