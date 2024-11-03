import { definePlugins } from '@gera2ld/plaid-rollup';
import { readPackageUp } from 'read-package-up';
import { defineConfig } from 'rollup';
import userscript from 'rollup-plugin-userscript';
import serve from 'rollup-plugin-serve';
import image from '@rollup/plugin-image';

const { packageJson } = await readPackageUp();

export default defineConfig(
  Object.entries({
    'main': 'src/main/index.ts',
  }).map(([name, entry]) => ({
    input: entry,
    plugins: [
      ...definePlugins({
        esm: true,
        minimize: false,
        postcss: {
          inject: false,
          minimize: true,
        },
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx'],
      }),
      image(),
      userscript((meta) =>
        meta.replace('process.env.AUTHOR', packageJson.author.name)
            .replace('process.env.VERSION', packageJson.version)
      ),
      process.env.ROLLUP_WATCH ? serve('dist') : undefined
    ],
    output: {
      format: 'iife',
      file: `dist/${name}.user.js`,
      indent: false,
    },
  })),
);
