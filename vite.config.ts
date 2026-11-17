import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `base: './'` makes the static build work from any folder or sub-path,
// so it can be dropped into the website or opened offline.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // three.js + drei alone is about 1.2 MB minified (330 kB gzip). It is one
    // cached download for an offline demo, so the limit sits just above it.
    chunkSizeWarningLimit: 1300,
    rolldownOptions: {
      output: {
        // Split the 3D engine and other libraries out of the app code so the
        // browser can cache them separately.
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/](three|three-stdlib|three-mesh-bvh|troika-[^\\/]+|postprocessing|@react-three)[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
})
