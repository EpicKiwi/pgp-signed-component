import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from "@rollup/plugin-node-resolve";

export default {
	input: 'src/index.ts',
	output: [
        {
            file: 'dist/pgp-signed.esm.js',
            format: 'es',
            sourcemap: true
        },
        {
            name: "pgpSignedComponent",
            file: 'dist/pgp-signed.js',
            format: 'iife',
            sourcemap: true
        }
    ],
    plugins: [
        commonjs({ extensions: ['.js', '.ts'] }),
        resolve({browser: true}),
        typescript({
            compilerOptions: {
                module: "esnext",
                lib: ["es5", "es6", "es2020", "dom"],
                target: "es6",
                }
            })
    ]
};