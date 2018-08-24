const path = require('path');
const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const typescript = require('rollup-plugin-typescript2');
const { uglify } = require('rollup-plugin-uglify');
const replace = require('rollup-plugin-replace');
const filesize = require('rollup-plugin-filesize');

const banner = (pkg) => `
/*! ${pkg.name} - v${pkg.version}
 * ${pkg.homepage}
 * Copyright (c) ${new Date().getFullYear()} - ${pkg.author};
 * Licensed ${pkg.license}
 */
`;

const cwd = process.cwd();

const plugins = [
  resolve(),
  commonjs(),
  typescript({
    tsconfig: path.join(__dirname, '../tsconfig.rollup.json'),
    typescript: require('typescript'),
    exclude: 'node_modules/**',
    useTsconfigDeclarationDir: true,
    tsconfigDefaults: {
      compilerOptions: {
        baseUrl: cwd,
        typeRoots: ['./types', path.resolve(cwd, '../../node_modules/@types')],
      },
    },
  }),
];

const file = (filepath) => path.resolve(cwd, filepath);
let pkg = {};

try {
  pkg = require(path.resolve(cwd, 'package.json'));
} catch (e) {
  console.warn(e);
}

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

const output = (obj) =>
  Object.assign(
    {
      sourcemap: true,
    },
    obj,
  );

module.exports = (pkg, globals) => [
  {
    input: './src/index.ts',
    output: [
      output({ file: file(pkg.main), format: 'cjs', banner: banner(pkg) }),
      output({ file: file(pkg.module), format: 'esm', banner: banner(pkg) }),
    ],
    external,
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify('development'),
      }),
      ...plugins,
      filesize(),
    ],
  },
  {
    input: './src/index.ts',
    output: output({
      file: file(pkg.unpkg),
      format: 'umd',
      name: pkg.amdName,
      extend: true,
      banner: banner(pkg),
      globals: Object.assign(
        {
          dush: 'dush',
        },
        globals,
      ),
    }),
    external,
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      ...plugins,
      uglify({
        warnings: false,
        mangle: true,
        compress: {
          pure_funcs: ['warn'],
        },
        output: {
          comments: /^!/,
        },
      }),
      filesize(),
    ],
  },
];