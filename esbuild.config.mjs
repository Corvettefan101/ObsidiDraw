import esbuild from "esbuild";
import process from "process";
import path from "path";

const prod = (process.argv[2] === "production");

const context = await esbuild.context({
    entryPoints: [path.resolve(process.cwd(), "main.ts")],
    bundle: true,
    format: "cjs",
    target: ["es2018"],
    platform: "browser",
    sourcemap: prod ? false : "inline",
    sourcesContent: prod ? false : true,
    treeShaking: true,
    outfile: "main.js",
});

if (prod) {
    await context.rebuild();
    process.exit(0);
} else {
    await context.watch();
}